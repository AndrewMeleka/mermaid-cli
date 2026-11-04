package cli

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/AndrewMeleka/mermaid-cli/internal/server"

	"github.com/spf13/cobra"
)

func newServeCmd() *cobra.Command {
	var host string
	var port int

	cmd := &cobra.Command{
		Use:   "serve [path]",
		Short: "Serve a live preview of every Mermaid file under path",
		Long: `serve walks path (default: the current directory) for Mermaid files,
lists them in the previewer's sidebar and re-renders a diagram whenever its
file changes on disk. node_modules and dot folders are skipped.`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.SilenceUsage = true

			root := "."
			if len(args) == 1 {
				root = args[0]
			}
			root, err := filepath.Abs(root)
			if err != nil {
				return err
			}
			info, err := os.Stat(root)
			if err != nil {
				return err
			}
			if !info.IsDir() {
				return fmt.Errorf("%s is not a directory", root)
			}

			srv, err := server.New(root)
			if err != nil {
				return err
			}
			defer srv.Close()

			httpSrv := &http.Server{
				Addr:              net.JoinHostPort(host, strconv.Itoa(port)),
				Handler:           srv,
				ReadHeaderTimeout: 10 * time.Second,
			}

			ctx, stop := signal.NotifyContext(cmd.Context(), os.Interrupt, syscall.SIGTERM)
			defer stop()

			errc := make(chan error, 1)
			go func() { errc <- httpSrv.ListenAndServe() }()

			log.Printf("mermaid: serving %s", root)
			log.Printf("mermaid: previewer is live at http://%s", displayAddr(host, port))

			select {
			case err := <-errc:
				return err
			case <-ctx.Done():
				log.Println("mermaid: shutting down")
				shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				if err := httpSrv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, context.DeadlineExceeded) {
					return err
				}
				return nil
			}
		},
	}

	cmd.Flags().StringVar(&host, "host", "0.0.0.0", "interface to listen on")
	cmd.Flags().IntVarP(&port, "port", "p", 9510, "port to listen on")
	return cmd
}

// displayAddr turns a wildcard bind address into something clickable.
func displayAddr(host string, port int) string {
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "localhost"
	}
	return net.JoinHostPort(host, strconv.Itoa(port))
}
