import * as stylex from "@stylexjs/stylex";
import { useMemo } from "react";
import type { MermaidFile } from "../api";
import { colors, radii } from "../tokens.stylex";

type Props = {
  root: string;
  files: MermaidFile[];
  selected: string | null;
  onSelect: (path: string) => void;
  connected: boolean;
};

type Group = { dir: string; files: MermaidFile[] };

function groupByDir(files: MermaidFile[]): Group[] {
  const map = new Map<string, MermaidFile[]>();
  for (const f of files) {
    const list = map.get(f.dir) ?? [];
    list.push(f);
    map.set(f.dir, list);
  }
  // The server already orders files (root first, then folder by folder);
  // keep that order so the first entry here is the one auto-selected.
  return [...map.entries()].map(([dir, list]) => ({ dir, files: list }));
}

export default function Sidebar({ root, files, selected, onSelect, connected }: Props) {
  const groups = useMemo(() => groupByDir(files), [files]);
  const rootName = root.split("/").filter(Boolean).pop() ?? root;

  return (
    <nav {...stylex.props(styles.nav)} aria-label="Diagrams">
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.dotA)} />
          <span {...stylex.props(styles.dotB)} />
          <span {...stylex.props(styles.brandText)}>mermaid</span>
        </div>
        <div {...stylex.props(styles.root)} title={root}>
          {rootName}
        </div>
      </div>

      <div {...stylex.props(styles.list)}>
        {files.length === 0 && (
          <div {...stylex.props(styles.empty)}>
            No .mmd or .mermaid files found under this folder.
          </div>
        )}
        {groups.map((g) => (
          <section key={g.dir || "/"} {...stylex.props(styles.group)}>
            <div {...stylex.props(styles.groupLabel)} title={g.dir || "/"}>
              {g.dir || "/"}
            </div>
            {g.files.map((f) => {
              const active = f.path === selected;
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => onSelect(f.path)}
                  aria-current={active ? "page" : undefined}
                  title={f.path}
                  {...stylex.props(styles.item, active && styles.itemActive)}
                >
                  <span {...stylex.props(styles.itemName)}>{f.name}</span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <div {...stylex.props(styles.footer)}>
        <span {...stylex.props(styles.status, connected ? styles.statusOn : styles.statusOff)} />
        {connected ? "live reload on" : "reconnecting…"}
        <span {...stylex.props(styles.count)}>
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
      </div>
    </nav>
  );
}

const styles = stylex.create({
  nav: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    backgroundColor: colors.forest,
    color: colors.cream,
    overflow: "hidden",
  },
  header: {
    padding: "18px 16px 12px",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.forestDeep,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dotA: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.cream,
  },
  dotB: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.copper,
    marginLeft: -3,
  },
  brandText: {
    marginLeft: 4,
    fontSize: 13,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: colors.sand,
    fontWeight: 600,
  },
  root: {
    fontSize: 15,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 8px 16px",
  },
  empty: {
    padding: 12,
    fontSize: 13,
    color: colors.sand,
    lineHeight: 1.5,
  },
  group: {
    marginBottom: 10,
  },
  groupLabel: {
    padding: "8px 8px 4px",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: colors.sage,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  item: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "7px 10px",
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: radii.sm,
    backgroundColor: {
      default: "transparent",
      ":hover": colors.forestDeep,
    },
    color: colors.cream,
    textAlign: "left",
    cursor: "pointer",
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${colors.copper}`,
    },
  },
  itemActive: {
    backgroundColor: {
      default: colors.sage,
      ":hover": colors.sage,
    },
    color: colors.forestDeep,
    fontWeight: 600,
  },
  itemName: {
    fontSize: 13.5,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.forestDeep,
    fontSize: 12,
    color: colors.sand,
  },
  status: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  statusOn: { backgroundColor: colors.sage },
  statusOff: { backgroundColor: colors.copper },
  count: {
    marginLeft: "auto",
    color: colors.sage,
  },
});
