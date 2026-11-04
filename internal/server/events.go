package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Event is what the SPA receives when something under the root changes.
type Event struct {
	// Path is the changed file relative to the root, "" when the change was a
	// folder (the SPA then only refreshes its file list).
	Path string `json:"path"`
	// Op is "write", "create", "remove" or "rename".
	Op string `json:"op"`
}

// broker fans events out to every open /api/events connection.
type broker struct {
	mu     sync.Mutex
	subs   map[chan Event]struct{}
	closed bool
}

func newBroker() *broker {
	return &broker{subs: map[chan Event]struct{}{}}
}

func (b *broker) subscribe() (ch chan Event, cancel func()) {
	ch = make(chan Event, 16)
	b.mu.Lock()
	if b.closed {
		close(ch)
	} else {
		b.subs[ch] = struct{}{}
	}
	b.mu.Unlock()
	return ch, func() {
		b.mu.Lock()
		if _, ok := b.subs[ch]; ok {
			delete(b.subs, ch)
			close(ch)
		}
		b.mu.Unlock()
	}
}

// publish delivers ev to every subscriber. A subscriber that is not keeping
// up simply misses the event: the SPA re-fetches on the next one anyway.
func (b *broker) publish(ev Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.subs {
		select {
		case ch <- ev:
		default:
		}
	}
}

func (b *broker) close() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.closed = true
	for ch := range b.subs {
		delete(b.subs, ch)
		close(ch)
	}
}

// ServeHTTP streams events as text/event-stream until the client leaves.
func (b *broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "event: ready\ndata: {}\n\n")
	flusher.Flush()

	ch, cancel := b.subscribe()
	defer cancel()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-heartbeat.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		case ev, open := <-ch:
			if !open {
				return
			}
			data, _ := json.Marshal(ev)
			fmt.Fprintf(w, "event: change\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}
