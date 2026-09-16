export function sanitizeExportFilename(value: string) {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return normalized || "孫子兵法-Match-Mapping";
}

export async function downloadElementAsPng(element: HTMLElement, title: string) {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    backgroundColor: "#f6efe1",
    cacheBust: true,
    pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    filter: node => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
  });
  const link = document.createElement("a");
  link.download = `${sanitizeExportFilename(title)}.png`;
  link.href = dataUrl;
  link.click();
}
