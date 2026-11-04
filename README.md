# mermaid-cli

A small live previewer for [Mermaid](https://mermaid.js.org) diagrams: one Go
binary that walks a folder for `.mmd` / `.mermaid` files, lists them in a
sidebar and re-renders a diagram the moment its file changes on disk.

```
mermaid serve ./docs
```

Then open http://localhost:9510.

## Features

- **Recursive discovery** of `.mmd` and `.mermaid` files, skipping
  `node_modules`, `vendor`, `dist`, `build` and dot folders.
- **Left sidebar** grouped by folder; the first file is selected by default and
  the selection survives a reload through the URL hash. Press `[` to collapse it.
- **Live reload** over server-sent events: edits re-render in place and keep
  your pan/zoom; new and removed files update the sidebar.
- **Pan and zoom** with the mouse wheel and drag, plus on-screen buttons.
  `+` / `-` zoom, `0` fits the diagram to the window, `1` resets to 100 %.
- **Export** (floating, top right) as SVG or as a 2× PNG.
- Parse errors are shown in a panel instead of a blank canvas.

## Usage

```
mermaid serve [path] [flags]

  path            folder to scan (default: current directory)
  --host string   interface to listen on (default "0.0.0.0")
  -p, --port int  port to listen on (default 9510)
```

## Building

Requirements: Go 1.26+, Node 20+, pnpm.

```
make build        # builds web/ into internal/web/dist, then bin/mermaid
make install      # same, then `go install` into $(go env GOPATH)/bin
make test         # go test + TypeScript typecheck
```

The SPA is embedded into the binary with `go:embed`, so the web build must run
before `go build`. `make build` does both.

## Layout

```
cmd/mermaid/main.go     entrypoint
internal/cli/           cobra commands (serve)
internal/scan/          file discovery and safe reads
internal/server/        HTTP API, SSE live-reload stream, fsnotify watcher
internal/web/           embeds the built SPA (dist/)
web/                    Vite + React + StyleX single-page app
```

### HTTP API

| Route                  | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `GET /api/files`       | root path and the list of Mermaid files      |
| `GET /api/files/{path}`| content of one file (relative, no escapes)   |
| `GET /api/events`      | `text/event-stream` of `change` events       |
| `GET /*`               | the SPA (`index.html` fallback)              |

## Development

Run the API and the Vite dev server side by side; Vite proxies `/api` to the
Go server on port 9510.

```
go run ./cmd/mermaid serve ./some/folder
pnpm --dir web dev          # http://localhost:5173
```

## Palette

StyleX tokens live in `web/src/tokens.stylex.ts`, derived from
https://colors.dopely.top/colorstudio?colors=BC8B68,D8B798,F0E2CF,7E9271,465343.
