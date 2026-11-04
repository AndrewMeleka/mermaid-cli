import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { colors, radii, shadows } from "../tokens.stylex";

type Props = {
  disabled: boolean;
  onExport: (format: "svg" | "png") => Promise<void> | void;
};

export default function ExportMenu({ disabled, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = async (format: "svg" | "png") => {
    setOpen(false);
    setBusy(true);
    try {
      await onExport(format);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapRef} {...stylex.props(styles.wrap)}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        {...stylex.props(styles.button)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 19h16" />
        </svg>
        {busy ? "Exporting…" : "Export"}
      </button>
      {open && (
        <div role="menu" {...stylex.props(styles.menu)}>
          <button type="button" role="menuitem" onClick={() => pick("svg")} {...stylex.props(styles.menuItem)}>
            <span {...stylex.props(styles.menuTitle)}>SVG</span>
            <span {...stylex.props(styles.menuHint)}>vector, editable</span>
          </button>
          <button type="button" role="menuitem" onClick={() => pick("png")} {...stylex.props(styles.menuItem)}>
            <span {...stylex.props(styles.menuTitle)}>PNG</span>
            <span {...stylex.props(styles.menuHint)}>2× raster on cream</span>
          </button>
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  wrap: {
    position: "relative",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 14px",
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: radii.pill,
    backgroundColor: {
      default: colors.copper,
      ":hover": colors.copperDeep,
      ":disabled": colors.sand,
    },
    color: colors.cream,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    boxShadow: shadows.float,
    outline: { default: "none", ":focus-visible": `2px solid ${colors.forest}` },
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: 180,
    padding: 6,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
    boxShadow: shadows.float,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.sand,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  menuItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    width: "100%",
    padding: "8px 10px",
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: radii.sm,
    backgroundColor: { default: "transparent", ":hover": colors.creamDeep },
    color: colors.ink,
    textAlign: "left",
    cursor: "pointer",
  },
  menuTitle: {
    fontWeight: 600,
    fontSize: 13.5,
  },
  menuHint: {
    fontSize: 11.5,
    color: colors.inkMuted,
  },
});
