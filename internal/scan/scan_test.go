package scan

import (
	"os"
	"path/filepath"
	"testing"
)

func write(t *testing.T, p, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestFilesFindsMermaidRecursivelyAndSkipsNoise(t *testing.T) {
	root := t.TempDir()
	write(t, filepath.Join(root, "b.mmd"), "graph TD")
	write(t, filepath.Join(root, "docs", "a.mermaid"), "graph LR")
	write(t, filepath.Join(root, "docs", "deep", "c.MMD"), "graph LR")
	write(t, filepath.Join(root, "docs", "readme.md"), "# no")
	write(t, filepath.Join(root, "node_modules", "x.mmd"), "graph LR")
	write(t, filepath.Join(root, ".git", "y.mmd"), "graph LR")

	files, err := Files(root)
	if err != nil {
		t.Fatal(err)
	}
	got := make([]string, len(files))
	for i, f := range files {
		got[i] = f.Path
	}
	want := []string{"b.mmd", "docs/a.mermaid", "docs/deep/c.MMD"}
	// root files first, then folders, each sorted by name
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
	if files[1].Dir != "docs" || files[1].Name != "a.mermaid" {
		t.Fatalf("bad dir/name: %+v", files[1])
	}
	if files[0].Dir != "" {
		t.Fatalf("root file should have empty dir: %+v", files[0])
	}
}

func TestReadRefusesEscapesAndNonMermaid(t *testing.T) {
	root := t.TempDir()
	write(t, filepath.Join(root, "ok.mmd"), "graph TD")
	write(t, filepath.Join(root, "secret.txt"), "nope")
	write(t, filepath.Join(root, "node_modules", "dep.mmd"), "graph TD")
	write(t, filepath.Join(root, ".git", "hook.mmd"), "graph TD")
	write(t, filepath.Join(filepath.Dir(root), "outside.mmd"), "graph TD")

	if data, _, err := Read(root, "ok.mmd"); err != nil || string(data) != "graph TD" {
		t.Fatalf("Read ok.mmd: %q, %v", data, err)
	}
	for _, bad := range []string{"../outside.mmd", "secret.txt", "", "/etc/passwd", "./ok.mmd", "node_modules/dep.mmd", ".git/hook.mmd"} {
		if _, _, err := Read(root, bad); err != ErrNotFound {
			t.Errorf("Read(%q) = %v, want ErrNotFound", bad, err)
		}
	}
}
