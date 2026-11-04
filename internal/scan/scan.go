// Package scan finds Mermaid files under a folder.
package scan

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Extensions are the file extensions treated as Mermaid sources.
var Extensions = []string{".mmd", ".mermaid"}

// skippedDirs are never descended into.
var skippedDirs = map[string]bool{
	"node_modules": true,
	"vendor":       true,
	"dist":         true,
	"build":        true,
}

// File is one Mermaid file, located relative to the scanned root.
type File struct {
	// Path is slash-separated and relative to the root, e.g. "docs/flow.mmd".
	Path    string    `json:"path"`
	Name    string    `json:"name"`
	Dir     string    `json:"dir"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
}

// IsMermaid reports whether name has a Mermaid extension.
func IsMermaid(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	for _, e := range Extensions {
		if ext == e {
			return true
		}
	}
	return false
}

// SkipDir reports whether a directory named name should not be walked:
// dependency and build output folders, and dot folders such as .git.
func SkipDir(name string) bool {
	if skippedDirs[name] {
		return true
	}
	return strings.HasPrefix(name, ".") && name != "." && name != ".."
}

// Files walks root and returns every Mermaid file, sorted by path.
func Files(root string) ([]File, error) {
	var files []File
	err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			// A folder we cannot read is not worth failing the whole scan.
			if d != nil && d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if d.IsDir() {
			if p != root && SkipDir(d.Name()) {
				return fs.SkipDir
			}
			return nil
		}
		if !IsMermaid(d.Name()) {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)
		files = append(files, File{
			Path:    rel,
			Name:    path.Base(rel),
			Dir:     dirOf(rel),
			Size:    info.Size(),
			ModTime: info.ModTime(),
		})
		return nil
	})
	if err != nil {
		return nil, err
	}
	// Root-level files first, then folder by folder, each by name: the order
	// the sidebar shows, so "the first file" means the same thing everywhere.
	sort.Slice(files, func(i, j int) bool {
		if files[i].Dir != files[j].Dir {
			if files[i].Dir == "" || files[j].Dir == "" {
				return files[i].Dir == ""
			}
			return files[i].Dir < files[j].Dir
		}
		return files[i].Name < files[j].Name
	})
	return files, nil
}

// dirOf is path.Dir with "" for the root instead of ".".
func dirOf(rel string) string {
	d := path.Dir(rel)
	if d == "." {
		return ""
	}
	return d
}

// ErrNotFound is returned by Read for paths outside the root or without a
// Mermaid extension, so callers can answer 404 without leaking the reason.
var ErrNotFound = errors.New("not found")

// Read returns the content of the Mermaid file at rel (slash-separated,
// relative to root). It refuses anything that escapes root.
func Read(root, rel string) ([]byte, os.FileInfo, error) {
	if rel == "" || !fs.ValidPath(rel) || !IsMermaid(rel) {
		return nil, nil, ErrNotFound
	}
	// Mirror Files: what the walk would not list cannot be read either.
	for _, part := range strings.Split(path.Dir(rel), "/") {
		if part != "." && SkipDir(part) {
			return nil, nil, ErrNotFound
		}
	}
	p := filepath.Join(root, filepath.FromSlash(rel))
	info, err := os.Stat(p)
	if err != nil || info.IsDir() {
		return nil, nil, ErrNotFound
	}
	data, err := os.ReadFile(p)
	if err != nil {
		return nil, nil, fmt.Errorf("read %s: %w", rel, err)
	}
	return data, info, nil
}
