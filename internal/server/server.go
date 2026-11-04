// Package server is the previewer's HTTP side: the JSON API the SPA reads,
// a server-sent-events stream for live reload, and the embedded SPA itself.
package server

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/AndrewMeleka/mermaid-cli/internal/scan"
	"github.com/AndrewMeleka/mermaid-cli/internal/web"
)

// Server serves one scanned root.
type Server struct {
	root    string
	mux     *http.ServeMux
	events  *broker
	watcher *watcher
}

// New builds the server for root and starts watching it for changes.
func New(root string) (*Server, error) {
	s := &Server{
		root:   root,
		mux:    http.NewServeMux(),
		events: newBroker(),
	}

	w, err := newWatcher(root, s.events.publish)
	if err != nil {
		return nil, err
	}
	s.watcher = w

	s.mux.HandleFunc("GET /api/files", s.handleFiles)
	s.mux.HandleFunc("GET /api/files/{path...}", s.handleFile)
	s.mux.HandleFunc("GET /api/events", s.events.ServeHTTP)
	s.mux.Handle("/", web.Handler())
	return s, nil
}

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

// Close stops the file watcher and drops every event subscriber.
func (s *Server) Close() error {
	s.events.close()
	return s.watcher.close()
}

type filesResponse struct {
	Root  string      `json:"root"`
	Files []scan.File `json:"files"`
}

func (s *Server) handleFiles(w http.ResponseWriter, r *http.Request) {
	files, err := scan.Files(s.root)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if files == nil {
		files = []scan.File{}
	}
	writeJSON(w, filesResponse{Root: filepath.ToSlash(s.root), Files: files})
}

type fileResponse struct {
	Path    string    `json:"path"`
	Content string    `json:"content"`
	ModTime time.Time `json:"modTime"`
}

func (s *Server) handleFile(w http.ResponseWriter, r *http.Request) {
	rel := strings.TrimPrefix(r.PathValue("path"), "/")
	data, info, err := scan.Read(s.root, rel)
	if errors.Is(err, scan.ErrNotFound) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, fileResponse{Path: rel, Content: string(data), ModTime: info.ModTime()})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("mermaid: write response: %v", err)
	}
}
