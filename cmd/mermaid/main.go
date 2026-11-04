// mermaid previews Mermaid diagrams in the browser.
package main

import "github.com/AndrewMeleka/mermaid-cli/internal/cli"

// version is set at build time: -ldflags "-X main.version=v1.2.3".
var version = "dev"

func main() {
	cli.Execute(version)
}
