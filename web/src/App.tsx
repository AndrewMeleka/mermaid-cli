import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFile, fetchFiles, subscribeChanges, type MermaidFile } from "./api";
import Diagram, { type DiagramHandle } from "./components/Diagram";
import ExportMenu from "./components/ExportMenu";
import Sidebar from "./components/Sidebar";
import { downloadPNG, downloadSVG } from "./export";
import { colors, radii, shadows } from "./tokens.stylex";

const SIDEBAR_WIDTH = 280;

function pathFromHash(): string | null {
  const h = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  return h || null;
}

export default function App() {
  const [root, setRoot] = useState("");
  const [files, setFiles] = useState<MermaidFile[]>([]);
  const [selected, setSelected] = useState<string | null>(pathFromHash);
  const [code, setCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const diagramRef = useRef<DiagramHandle>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const select = useCallback((path: string | null) => {
    setSelected(path);
    const next = path ? `#/${path.split("/").map(encodeURIComponent).join("/")}` : "";
    if (window.location.hash !== next) history.replaceState(null, "", next || window.location.pathname);
  }, []);

  // File list: on load, and whenever the server reports a change.
  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetchFiles();
      setRoot(res.root);
      setFiles(res.files);
      const current = selectedRef.current;
      const stillThere = current && res.files.some((f) => f.path === current);
      if (!stillThere) select(res.files[0]?.path ?? null);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [select]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  // Content of the selected file.
  const loadSelected = useCallback(async (path: string) => {
    try {
      const res = await fetchFile(path);
      if (selectedRef.current !== path) return;
      setCode(res.content);
      setLoadError(null);
    } catch (e) {
      setCode(null);
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setCode(null);
      return;
    }
    void loadSelected(selected);
  }, [selected, loadSelected]);

  useEffect(() => {
    document.title = selected ? `${selected.split("/").pop()} · Mermaid Previewer` : "Mermaid Previewer";
  }, [selected]);

  // Live reload.
  useEffect(() => {
    return subscribeChanges((ev) => {
      void refreshFiles();
      if (ev.path && ev.path === selectedRef.current && ev.op !== "remove") {
        void loadSelected(ev.path);
      }
    }, setConnected);
  }, [refreshFiles, loadSelected]);

  // Back/forward or a hand-edited hash.
  useEffect(() => {
    const onHash = () => setSelected(pathFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Keyboard: "[" toggles the sidebar, "0" fits, "1" resets, +/- zoom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "[":
          setSidebarOpen((o) => !o);
          break;
        case "0":
          diagramRef.current?.fit();
          break;
        case "1":
          diagramRef.current?.reset();
          break;
        case "+":
        case "=":
          diagramRef.current?.zoomIn();
          break;
        case "-":
          diagramRef.current?.zoomOut();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onExport = async (format: "svg" | "png") => {
    if (!selected || !diagramRef.current) return;
    const base = selected.split("/").pop()!.replace(/\.(mmd|mermaid)$/i, "");
    if (format === "svg") {
      const svg = diagramRef.current.svg();
      if (svg) downloadSVG(svg, base);
      return;
    }
    const svg = await diagramRef.current.exportSvg();
    if (svg) await downloadPNG(svg, base);
  };

  return (
    <div {...stylex.props(styles.app)}>
      <aside {...stylex.props(styles.sidebar, !sidebarOpen && styles.sidebarClosed)} aria-hidden={!sidebarOpen}>
        <Sidebar root={root} files={files} selected={selected} onSelect={select} connected={connected} />
      </aside>

      <main {...stylex.props(styles.main)}>
        <div {...stylex.props(styles.topLeft)}>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={sidebarOpen}
            title="Toggle sidebar  ( [ )"
            {...stylex.props(styles.iconButton)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {selected && (
            <div {...stylex.props(styles.pathPill)} title={selected}>
              {selected}
            </div>
          )}
        </div>

        <div {...stylex.props(styles.topRight)}>
          <ExportMenu disabled={!code} onExport={onExport} />
        </div>

        <div {...stylex.props(styles.bottomRight)} role="group" aria-label="Zoom">
          <button type="button" title="Zoom in  (+)" aria-label="Zoom in" onClick={() => diagramRef.current?.zoomIn()} {...stylex.props(styles.iconButton)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button type="button" title="Zoom out  (−)" aria-label="Zoom out" onClick={() => diagramRef.current?.zoomOut()} {...stylex.props(styles.iconButton)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
          <button type="button" title="Fit to screen  (0)" aria-label="Fit to screen" onClick={() => diagramRef.current?.fit()} {...stylex.props(styles.iconButton)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
        </div>

        {code && selected ? (
          <Diagram ref={diagramRef} id={selected} code={code} />
        ) : (
          <div {...stylex.props(styles.placeholder)}>
            {loadError ? (
              <>
                <div {...stylex.props(styles.placeholderTitle)}>Can't reach the previewer</div>
                <div>{loadError}</div>
              </>
            ) : files.length === 0 && root ? (
              <>
                <div {...stylex.props(styles.placeholderTitle)}>No diagrams yet</div>
                <div>Add a .mmd or .mermaid file under this folder and it will show up here.</div>
              </>
            ) : (
              <div>Loading…</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = stylex.create({
  app: {
    display: "flex",
    width: "100%",
    height: "100%",
    backgroundColor: colors.cream,
    color: colors.ink,
  },
  sidebar: {
    flexShrink: 0,
    width: SIDEBAR_WIDTH,
    height: "100%",
    overflow: "hidden",
    transition: "width 180ms ease",
  },
  sidebarClosed: {
    width: 0,
  },
  main: {
    position: "relative",
    flex: 1,
    minWidth: 0,
    height: "100%",
    backgroundColor: colors.cream,
    backgroundImage: `radial-gradient(${colors.sand} 1px, transparent 1px)`,
    backgroundSize: "22px 22px",
  },
  topLeft: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: 10,
    maxWidth: "calc(100% - 180px)",
  },
  topRight: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 2,
  },
  bottomRight: {
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  iconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: { default: colors.cream, ":hover": colors.creamDeep },
    color: colors.forest,
    cursor: "pointer",
    boxShadow: shadows.float,
    outline: { default: "none", ":focus-visible": `2px solid ${colors.copper}` },
  },
  pathPill: {
    padding: "8px 12px",
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
    color: colors.cream,
    fontSize: 12.5,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: shadows.float,
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: "100%",
    padding: 24,
    textAlign: "center",
    color: colors.inkMuted,
    fontSize: 14,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.forest,
  },
});
