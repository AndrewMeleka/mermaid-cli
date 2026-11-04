package server

import (
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/AndrewMeleka/mermaid-cli/internal/scan"

	"github.com/fsnotify/fsnotify"
)

// debounce coalesces the burst of events an editor save produces.
const debounce = 100 * time.Millisecond

// watcher follows every folder under root (recursively, picking up new ones)
// and reports Mermaid file changes and folder changes through emit.
type watcher struct {
	root string
	fsw  *fsnotify.Watcher
	emit func(Event)
	done chan struct{}
	wg   sync.WaitGroup
}

func newWatcher(root string, emit func(Event)) (*watcher, error) {
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	w := &watcher{root: root, fsw: fsw, emit: emit, done: make(chan struct{})}
	if err := w.addTree(root); err != nil {
		fsw.Close()
		return nil, err
	}
	w.wg.Add(1)
	go w.loop()
	return w, nil
}

// addTree watches dir and every folder below it that scan would descend into.
func (w *watcher) addTree(dir string) error {
	return filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if !d.IsDir() {
			return nil
		}
		if p != w.root && scan.SkipDir(d.Name()) {
			return fs.SkipDir
		}
		if err := w.fsw.Add(p); err != nil {
			log.Printf("mermaid: watch %s: %v", p, err)
		}
		return nil
	})
}

func (w *watcher) loop() {
	defer w.wg.Done()

	pending := map[string]Event{}
	var timer *time.Timer
	var fire <-chan time.Time

	flush := func() {
		for _, ev := range pending {
			w.emit(ev)
		}
		pending = map[string]Event{}
		fire = nil
	}

	for {
		select {
		case <-w.done:
			return
		case <-fire:
			flush()
		case err, ok := <-w.fsw.Errors:
			if !ok {
				return
			}
			log.Printf("mermaid: watcher: %v", err)
		case ev, ok := <-w.fsw.Events:
			if !ok {
				return
			}
			e, keep := w.classify(ev)
			if !keep {
				continue
			}
			pending[e.Path+"|"+e.Op] = e
			if timer == nil {
				timer = time.NewTimer(debounce)
			} else {
				timer.Reset(debounce)
			}
			fire = timer.C
		}
	}
}

// classify maps an fsnotify event to ours, and starts watching folders that
// appear. Events for non-Mermaid files are dropped.
func (w *watcher) classify(ev fsnotify.Event) (Event, bool) {
	rel, err := filepath.Rel(w.root, ev.Name)
	if err != nil {
		return Event{}, false
	}
	rel = filepath.ToSlash(rel)

	op := ""
	switch {
	case ev.Has(fsnotify.Create):
		op = "create"
	case ev.Has(fsnotify.Write):
		op = "write"
	case ev.Has(fsnotify.Remove):
		op = "remove"
	case ev.Has(fsnotify.Rename):
		op = "rename"
	default:
		return Event{}, false
	}

	if scan.IsMermaid(ev.Name) {
		return Event{Path: rel, Op: op}, true
	}

	// Not a Mermaid file: only folders matter, because they may hold some.
	if op == "create" {
		if info, err := os.Stat(ev.Name); err == nil && info.IsDir() {
			if scan.SkipDir(filepath.Base(ev.Name)) {
				return Event{}, false
			}
			_ = w.addTree(ev.Name)
			return Event{Path: "", Op: op}, true
		}
		return Event{}, false
	}
	if op == "remove" || op == "rename" {
		// Could have been a folder full of diagrams; cheap to refresh the list.
		return Event{Path: "", Op: op}, true
	}
	return Event{}, false
}

func (w *watcher) close() error {
	close(w.done)
	err := w.fsw.Close()
	w.wg.Wait()
	return err
}
