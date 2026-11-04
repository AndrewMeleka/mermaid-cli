import * as stylex from "@stylexjs/stylex";

// Palette: https://colors.dopely.top/colorstudio?colors=BC8B68,D8B798,F0E2CF,7E9271,465343
export const colors = stylex.defineVars({
  copper: "#BC8B68",
  sand: "#D8B798",
  cream: "#F0E2CF",
  sage: "#7E9271",
  forest: "#465343",

  // Derived shades so the five base colors can carry a whole UI.
  creamDeep: "#E6D3BA",
  sandDeep: "#C9A480",
  copperDeep: "#A5734F",
  sageDeep: "#67795C",
  forestDeep: "#363F35",
  ink: "#2B332C",
  inkMuted: "#6C7466",
  danger: "#A94F3D",
  dangerSoft: "#F6DED7",
});

export const radii = stylex.defineVars({
  sm: "6px",
  md: "10px",
  lg: "14px",
  pill: "999px",
});

export const shadows = stylex.defineVars({
  float: "0 6px 20px rgba(54, 63, 53, 0.18), 0 1px 2px rgba(54, 63, 53, 0.12)",
});
