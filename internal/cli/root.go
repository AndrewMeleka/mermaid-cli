// Package cli is the mermaid command line.
//
//	mermaid serve [path]    serve a live preview of every Mermaid file under path
package cli

import (
	"log"
	"os"

	"github.com/spf13/cobra"
)

// version is the build version, set by Execute from main's -ldflags value.
var version = "dev"

// Execute runs the mermaid command line and exits non-zero on failure.
func Execute(v string) {
	version = v
	log.SetFlags(0)
	if err := newRootCmd().Execute(); err != nil {
		os.Exit(1)
	}
}

func newRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:     "mermaid",
		Short:   "Preview Mermaid diagrams in the browser",
		Long:    "mermaid finds the Mermaid files (.mmd, .mermaid) under a folder and serves a live preview of them.",
		Version: version,
		Args:    cobra.NoArgs,
	}
	root.AddCommand(newServeCmd())
	return root
}
