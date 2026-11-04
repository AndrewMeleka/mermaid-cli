import * as stylex from "@stylexjs/stylex";
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import svgPanZoom from "svg-pan-zoom";
import mermaid, { renderForExport } from "../mermaid-theme";
import { colors, radii, shadows } from "../tokens.stylex";

export type DiagramHandle = {
  /** The last successfully rendered SVG markup, untouched by pan/zoom. */
  svg: () => string | null;
  /** A fresh render with plain text labels, safe to rasterise. */
  exportSvg: () => Promise<string | null>;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
};

type Props = {
  /** Identifies the diagram; pan/zoom is kept across re-renders of the same one. */
  id: string;
  code: string;
};

let renderSeq = 0;

const Diagram = forwardRef<DiagramHandle, Props>(function Diagram({ id, code }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<SvgPanZoom.Instance | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const svgRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    svg: () => svgRef.current,
    exportSvg: async () => {
      if (!svgRef.current) return null;
      try {
        return await renderForExport(code);
      } catch {
        return svgRef.current;
      }
    },
    zoomIn: () => panZoomRef.current?.zoomIn(),
    zoomOut: () => panZoomRef.current?.zoomOut(),
    fit: () => {
      const pz = panZoomRef.current;
      if (!pz) return;
      pz.resize();
      pz.fit();
      pz.center();
    },
    reset: () => {
      const pz = panZoomRef.current;
      if (!pz) return;
      pz.resetZoom();
      pz.center();
    },
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    (async () => {
      const renderId = `mmd-${++renderSeq}`;
      let svg: string;
      try {
        await mermaid.parse(code);
        ({ svg } = await mermaid.render(renderId, code));
      } catch (e) {
        // mermaid may leave a stray element behind on failure.
        document.getElementById(`d${renderId}`)?.remove();
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        return;
      }
      if (cancelled) return;

      // Remember the viewport when re-rendering the same file (live reload),
      // so an edit doesn't throw the reader back to "fit".
      const sameDiagram = lastIdRef.current === id;
      const prev = panZoomRef.current;
      // realZoom is absolute (CTM scale); getZoom() is relative to "fit",
      // which changes whenever the diagram's size does.
      const keep = sameDiagram && prev ? { realZoom: prev.getSizes().realZoom, pan: prev.getPan() } : null;
      prev?.destroy();
      panZoomRef.current = null;

      svgRef.current = svg;
      host.innerHTML = svg;
      setError(null);

      const el = host.querySelector("svg");
      if (!el) return;
      el.removeAttribute("width");
      el.removeAttribute("height");
      el.style.maxWidth = "none";
      el.style.width = "100%";
      el.style.height = "100%";

      const pz = svgPanZoom(el, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true,
        minZoom: 0.1,
        maxZoom: 40,
        zoomScaleSensitivity: 0.25,
        dblClickZoomEnabled: true,
      });
      if (keep) {
        pz.zoom(keep.realZoom / pz.getSizes().realZoom);
        pz.pan(keep.pan);
      }
      panZoomRef.current = pz;
      lastIdRef.current = id;
    })();

    return () => {
      cancelled = true;
    };
  }, [id, code]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => panZoomRef.current?.resize());
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => panZoomRef.current?.destroy(), []);

  return (
    <div {...stylex.props(styles.wrap)}>
      <div ref={hostRef} {...stylex.props(styles.host)} />
      {error && (
        <div {...stylex.props(styles.error)} role="alert">
          <div {...stylex.props(styles.errorTitle)}>Mermaid couldn't parse this file</div>
          <pre {...stylex.props(styles.errorBody)}>{error}</pre>
        </div>
      )}
    </div>
  );
});

export default Diagram;

const styles = stylex.create({
  wrap: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  host: {
    width: "100%",
    height: "100%",
    cursor: "grab",
    ":active": { cursor: "grabbing" },
  },
  error: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    maxHeight: "40%",
    overflow: "auto",
    padding: "12px 14px",
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    boxShadow: shadows.float,
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: colors.danger,
  },
  errorTitle: {
    fontWeight: 600,
    marginBottom: 6,
    fontSize: 13,
  },
  errorBody: {
    margin: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
});
