import type { Express } from "express";
import { SUNZI_CANONICAL_ORIGIN, SUNZI_INDEXABLE_PATHS, seoForPath } from "../../shared/sunzi-seo";

const canonicalOrigin = (process.env.CANONICAL_ORIGIN || SUNZI_CANONICAL_ORIGIN).replace(/\/+$/, "");

const escapeXml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

export function buildSitemapXml() {
  const urls = SUNZI_INDEXABLE_PATHS.map(path => {
    const head = seoForPath(path);
    const image = head.imagePath
      ? `<image:image><image:loc>${escapeXml(`${canonicalOrigin}${head.imagePath}`)}</image:loc><image:title>${escapeXml(head.title)}</image:title></image:image>`
      : "";
    const alternates = (head.alternates ?? []).map(alternate =>
      `<xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(`${canonicalOrigin}${alternate.path}`)}" />`,
    ).join("");
    return `  <url><loc>${escapeXml(`${canonicalOrigin}${path}`)}</loc>${alternates}${image}</url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /events\n\nSitemap: ${canonicalOrigin}/sitemap.xml\n`;
}

export function registerSeoRoutes(app: Express) {
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(buildSitemapXml());
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(buildRobotsTxt());
  });
}
