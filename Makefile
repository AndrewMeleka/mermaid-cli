VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)

.PHONY: all web build install test clean

all: build

## web: build the SPA into internal/web/dist (embedded by the Go binary)
web:
	pnpm --dir web install --frozen-lockfile
	pnpm --dir web build

## build: build the SPA then the binary into bin/mermaid
build: web
	go build -ldflags "-X main.version=$(VERSION)" -o bin/mermaid ./cmd/mermaid

## install: build and install the binary into $(go env GOPATH)/bin
install: web
	go install -ldflags "-X main.version=$(VERSION)" ./cmd/mermaid

test:
	go test ./...
	pnpm --dir web typecheck

clean:
	rm -rf bin web/dist
	find internal/web/dist -mindepth 1 ! -name .gitkeep -delete
