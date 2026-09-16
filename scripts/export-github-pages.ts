import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { composeHtml } from "../server/_core/vite";
import { SUNZI_CANONICAL_ORIGIN, SUNZI_INDEXABLE_PATHS } from "../shared/sunzi-seo";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "sunzi-art-of-war";
const basePath = (process.env.PAGES_BASE_PATH || `/${repositoryName}/`).replace(/\/+$/, "");
const outputDir = path.resolve(process.env.PAGES_CLIENT_OUT_DIR || "dist/pages");
const ssrEntry = path.resolve(process.env.PAGES_SSR_OUT_DIR || "dist/pages-ssr", "entry-server.js");
const templatePath = path.join(outputDir, "index.html");
const template = (await readFile(templatePath, "utf8"))
  .replace(/\s*<script[^>]+%VITE_ANALYTICS_ENDPOINT%[^>]*><\/script>/g, "");
const { render } = await import(pathToFileURL(ssrEntry).href) as {
  render: (url: string, prefetch: Record<string, never>, basePath?: string) => Promise<{
    html: string;
    dehydratedState: unknown;
    head: Parameters<typeof composeHtml>[2];
  }>;
};

function deployedPath(route: string) {
  return route === "/" ? `${basePath}/` : `${basePath}${route}`;
}

function targetForRoute(route: string) {
  if (route === "/") return path.join(outputDir, "index.html");
  return path.join(outputDir, route.replace(/^\/+/, ""), "index.html");
}

async function exportRoute(route: string) {
  const { html, dehydratedState, head } = await render(deployedPath(route), {}, basePath);
  const target = targetForRoute(route);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, composeHtml(template, html, head, dehydratedState));
}

for (const route of SUNZI_INDEXABLE_PATHS) await exportRoute(route);
await exportRoute("/events");

const missing = await render(`${basePath}/404`, {}, basePath);
await writeFile(path.join(outputDir, "404.html"), composeHtml(template, missing.html, missing.head, missing.dehydratedState));
await writeFile(path.join(outputDir, ".nojekyll"), "");
await writeFile(path.join(outputDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SUNZI_CANONICAL_ORIGIN}/sitemap.xml\n`);

console.log(JSON.stringify({
  basePath,
  publicRoutes: SUNZI_INDEXABLE_PATHS.length,
  htmlFiles: SUNZI_INDEXABLE_PATHS.length + 2,
  outputDir,
}, null, 2));
