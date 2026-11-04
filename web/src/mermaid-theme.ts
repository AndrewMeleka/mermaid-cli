import mermaid, { type MermaidConfig } from "mermaid";

// Palette: https://colors.dopely.top/colorstudio?colors=BC8B68,D8B798,F0E2CF,7E9271,465343
// The diagram's own classDef/style directives still win over these.
// Large and finite: mermaid clamps the label box to 16384px anyway, and a
// finite number survives any JSON round-trip of the config.
const NO_WRAP = 100_000;

const baseConfig: MermaidConfig = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  // Mermaid 12 wraps labels at 120px by default, splitting phrases mid-word.
  // Without a limit a label sizes to its content and only breaks at <br/>,
  // so node width follows the text. A file can still opt into wrapping with
  // %%{init: {"flowchart": {"wrappingWidth": 200}}}%%.
  flowchart: { wrappingWidth: NO_WRAP },
  state: { wrappingWidth: NO_WRAP },
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  themeVariables: {
    background: "#F0E2CF",
    primaryColor: "#F0E2CF",
    primaryBorderColor: "#BC8B68",
    primaryTextColor: "#2B332C",
    secondaryColor: "#D8B798",
    secondaryBorderColor: "#A5734F",
    secondaryTextColor: "#2B332C",
    tertiaryColor: "#E6D3BA",
    tertiaryBorderColor: "#7E9271",
    tertiaryTextColor: "#2B332C",
    lineColor: "#465343",
    textColor: "#2B332C",
    noteBkgColor: "#D8B798",
    noteBorderColor: "#BC8B68",
    clusterBkg: "rgba(126, 146, 113, 0.14)",
    clusterBorder: "#7E9271",
    edgeLabelBackground: "#F0E2CF",
    actorBkg: "#F0E2CF",
    actorBorder: "#BC8B68",
    signalColor: "#465343",
    labelBoxBkgColor: "#D8B798",
  },
};

mermaid.initialize(baseConfig);

let exportSeq = 0;

/**
 * Renders `code` with plain SVG text labels instead of HTML labels.
 * Chromium taints a canvas when it draws an SVG containing <foreignObject>,
 * which would make PNG export impossible; text labels also travel better
 * into tools that open the SVG without a browser engine.
 */
export async function renderForExport(code: string): Promise<string> {
  mermaid.initialize({
    ...baseConfig,
    htmlLabels: false,
    flowchart: { ...baseConfig.flowchart, htmlLabels: false },
    class: { ...baseConfig.class, htmlLabels: false },
    state: { ...baseConfig.state, htmlLabels: false } as MermaidConfig["state"],
  });
  const id = `mmd-export-${++exportSeq}`;
  try {
    const { svg } = await mermaid.render(id, code);
    return svg;
  } finally {
    document.getElementById(`d${id}`)?.remove();
    mermaid.initialize(baseConfig);
  }
}

export default mermaid;
