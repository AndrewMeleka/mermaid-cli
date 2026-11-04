/** Downloads the SVG markup as a file. */
export function downloadSVG(svg: string, baseName: string) {
  const blob = new Blob([withXmlns(svg)], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), `${baseName}.svg`, true);
}

/** Rasterises the SVG to a PNG at `scale`× the diagram's own size. */
export async function downloadPNG(svg: string, baseName: string, scale = 2, background = "#F0E2CF") {
  const { width, height } = svgSize(svg);
  const img = new Image();
  img.decoding = "async";
  const src = URL.createObjectURL(new Blob([withXmlns(svg, width, height)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("could not rasterise the SVG"));
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unsupported");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("could not encode the PNG");
    triggerDownload(URL.createObjectURL(blob), `${baseName}.png`, true);
  } finally {
    URL.revokeObjectURL(src);
  }
}

function svgSize(svg: string): { width: number; height: number } {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  const vb = el.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb.every((n) => Number.isFinite(n))) {
    return { width: vb[2], height: vb[3] };
  }
  const w = parseFloat(el.getAttribute("width") ?? "");
  const h = parseFloat(el.getAttribute("height") ?? "");
  return { width: Number.isFinite(w) ? w : 1200, height: Number.isFinite(h) ? h : 800 };
}

/** Makes the markup a standalone SVG document with explicit pixel size. */
function withXmlns(svg: string, width?: number, height?: number): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!el.getAttribute("xmlns:xlink")) el.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  el.style.maxWidth = "";
  if (width && height) {
    el.setAttribute("width", String(width));
    el.setAttribute("height", String(height));
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(el);
}

function triggerDownload(url: string, name: string, revoke: boolean) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
