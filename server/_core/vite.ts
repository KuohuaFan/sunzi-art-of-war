import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import superjson from "superjson";
import { createServer as createViteServer } from "vite";
import { SUNZI_CANONICAL_ORIGIN, SUNZI_SITE_NAME, type SunziHeadMeta } from "../../shared/sunzi-seo";
import viteConfig from "../../vite.config";
import { buildSsrPrefetch } from "./ssrCaller";

const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || SUNZI_CANONICAL_ORIGIN).replace(/\/+$/, "");
const SITE_NAME = process.env.SITE_NAME || SUNZI_SITE_NAME;

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const clampText = (value: string, max: number) => {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  return characters.length <= max ? characters.join("") : `${characters.slice(0, max - 1).join("")}…`;
};

export function buildHeadTags(head: SunziHeadMeta): string {
  const title = escapeHtml(clampText(head.title, 70) || SITE_NAME);
  const description = escapeHtml(clampText(head.description, 160));
  const canonicalUrl = head.canonicalPath ? `${CANONICAL_ORIGIN}${head.canonicalPath}` : undefined;
  const imageUrl = head.imagePath ? `${CANONICAL_ORIGIN}${head.imagePath}` : undefined;
  const siteName = escapeHtml(head.siteName ?? SITE_NAME);
  const imageAlt = escapeHtml(head.imageAlt ?? `${head.title} 分享圖片`);
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="keywords" content="${escapeHtml(head.keywords.join(","))}" />`,
    `<meta property="og:type" content="${head.ogType ?? "website"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:locale" content="${escapeHtml(head.ogLocale ?? "zh_TW")}" />`,
    `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];

  if (imageUrl) {
    const escapedImage = escapeHtml(imageUrl);
    tags.push(`<meta property="og:image" content="${escapedImage}" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
    tags.push(`<meta property="og:image:alt" content="${imageAlt}" />`);
    tags.push(`<meta name="twitter:image" content="${escapedImage}" />`);
    tags.push(`<meta name="twitter:image:alt" content="${imageAlt}" />`);
  }

  if (canonicalUrl) {
    const escapedCanonical = escapeHtml(canonicalUrl);
    tags.push(`<meta property="og:url" content="${escapedCanonical}" />`);
    tags.push(`<link rel="canonical" href="${escapedCanonical}" />`);
  }
  if (head.prevPath) tags.push(`<link rel="prev" href="${escapeHtml(`${CANONICAL_ORIGIN}${head.prevPath}`)}" />`);
  if (head.nextPath) tags.push(`<link rel="next" href="${escapeHtml(`${CANONICAL_ORIGIN}${head.nextPath}`)}" />`);
  head.alternates?.forEach(alternate => {
    tags.push(`<link rel="alternate" hreflang="${escapeHtml(alternate.hreflang)}" href="${escapeHtml(`${CANONICAL_ORIGIN}${alternate.path}`)}" data-sunzi-i18n="true" />`);
  });
  if (head.noindex || head.notFound) tags.push(`<meta name="robots" content="noindex, follow" />`);

  if (canonicalUrl) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": head.ogType === "article" ? "Article" : "WebSite",
      name: head.title,
      headline: head.ogType === "article" ? head.title : undefined,
      description: head.description,
      url: canonicalUrl,
      image: imageUrl,
      inLanguage: head.htmlLang ?? "zh-Hant",
      isPartOf: head.ogType === "article" ? { "@type": "WebSite", name: head.siteName ?? SITE_NAME, url: CANONICAL_ORIGIN } : undefined,
    };
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`);
  }
  return tags.join("\n");
}

export function composeHtml(template: string, appHtml: string, head: SunziHeadMeta, dehydratedState: unknown) {
  const state = JSON.stringify(superjson.serialize(dehydratedState)).replace(/</g, "\\u003c");
  const stateScript = `<script>window.__RQ_STATE__ = ${state}</script>`;
  return template
    .replace("<!--app-lang-->", () => escapeHtml(head.htmlLang ?? "zh-Hant"))
    .replace("</body>", () => `${stateScript}</body>`)
    .replace("<!--app-head-->", () => buildHeadTags(head))
    .replace("<!--app-html-->", () => appHtml);
}

function sendSsr(res: express.Response, template: string, html: string, head: SunziHeadMeta, dehydratedState: unknown) {
  if (head.noindex || head.notFound) res.set("X-Robots-Tag", "noindex, follow");
  res
    .status(head.notFound ? 404 : 200)
    .set("Cache-Control", "no-cache")
    .type("html")
    .end(composeHtml(template, html, head, dehydratedState));
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server }, allowedHosts: true as const },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(import.meta.dirname, "../..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/entry-client.tsx"`,
        `src="/src/entry-client.tsx?v=${nanoid()}"`,
      );
      template = await vite.transformIndexHtml(url, template);
      template = template.replace("</head>", `<link rel="stylesheet" href="/src/index.css?direct" data-ssr-dev-css></head>`);
      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const prefetch = await buildSsrPrefetch();
      const { html, dehydratedState, head } = await render(url, prefetch);
      sendSsr(res, template, html, head, dehydratedState);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error("[SSR] dev render failed:", error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = process.env.NODE_ENV === "development"
    ? path.resolve(import.meta.dirname, "../..", "dist", "public")
    : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  app.use((req, res, next) => {
    if (req.path === "/index.html") return res.redirect(301, "/");
    if (req.path !== "/" && /\/+$/i.test(req.path)) {
      const query = req.originalUrl.slice(req.path.length);
      const target = (req.path.replace(/\/+$/, "") || "/").replace(/^\/\/+/, "/");
      return res.redirect(301, target + query);
    }
    next();
  });
  app.use(express.static(distPath, { index: false, redirect: false }));

  const templatePath = path.resolve(distPath, "index.html");
  const serverEntryPath = process.env.NODE_ENV === "development"
    ? path.resolve(import.meta.dirname, "../..", "dist", "server-ssr", "entry-server.js")
    : path.resolve(import.meta.dirname, "server-ssr", "entry-server.js");

  app.use("*", async (req, res) => {
    try {
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const { render } = await import(serverEntryPath);
      const prefetch = await buildSsrPrefetch();
      const { html, dehydratedState, head } = await render(req.originalUrl, prefetch);
      sendSsr(res, template, html, head, dehydratedState);
    } catch (error) {
      console.error("[SSR] render failed, serving shell:", error);
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const fallbackHead: SunziHeadMeta = {
        title: SITE_NAME,
        description: "《孫子兵法》十三篇原文、篇旨今譯與要義提點線上讀本。",
        keywords: ["孫子兵法", "孫子兵法原文", "孫子兵法十三篇"],
      };
      res.status(200).set("Cache-Control", "no-cache").type("html").end(
        template
          .replace("<!--app-lang-->", () => "zh-Hant")
          .replace("<!--app-head-->", () => buildHeadTags(fallbackHead))
          .replace("<!--app-html-->", () => ""),
      );
    }
  });
}
