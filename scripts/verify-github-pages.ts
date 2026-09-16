import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { SUNZI_INDEXABLE_PATHS } from "../shared/sunzi-seo";

const outputDir = path.resolve(process.env.PAGES_CLIENT_OUT_DIR || "dist/pages");
const basePath = (process.env.PAGES_BASE_PATH || "/sunzi-art-of-war/").replace(/\/+$/, "");

function targetForRoute(route: string) {
  return route === "/"
    ? path.join(outputDir, "index.html")
    : path.join(outputDir, route.replace(/^\/+/, ""), "index.html");
}

for (const route of SUNZI_INDEXABLE_PATHS) {
  const target = targetForRoute(route);
  const html = await readFile(target, "utf8");
  if (!html.includes("<div id=\"root\">") || !html.includes("<title>")) throw new Error(`Incomplete HTML: ${route}`);
  if (!html.includes(`${basePath}/brand/sunzi-logo-512.png`)) throw new Error(`Missing Logo: ${route}`);
  if (!html.includes("https://sunziaow.manus.space")) throw new Error(`Missing canonical origin: ${route}`);
  if (!html.includes(`${basePath}/assets/`)) throw new Error(`Missing base-aware asset URL: ${route}`);
}

const events = await readFile(targetForRoute("/events"), "utf8");
if (!events.includes("私人事件簿請使用完整站") || !events.includes("https://sunziaow.manus.space/events")) {
  throw new Error("Static event-journal fallback is incomplete");
}

const missing = await readFile(path.join(outputDir, "404.html"), "utf8");
if (!missing.includes("找不到頁面") || !missing.includes("noindex")) throw new Error("404 page is incomplete");

for (const asset of [
  ".nojekyll",
  "brand/sunzi-logo-512.png",
  "brand/favicon-32.png",
  "brand/favicon-64.png",
  "brand/apple-touch-icon.png",
  "site.webmanifest",
]) await access(path.join(outputDir, asset));

const assets = await readdir(path.join(outputDir, "assets"));
if (!assets.some(file => file.endsWith(".js")) || !assets.some(file => file.endsWith(".css"))) {
  throw new Error("Built JavaScript or CSS assets are missing");
}

console.log(JSON.stringify({
  status: "passed",
  indexableRoutes: SUNZI_INDEXABLE_PATHS.length,
  generatedHtmlFiles: SUNZI_INDEXABLE_PATHS.length + 2,
  logoRoutes: SUNZI_INDEXABLE_PATHS.length,
}, null, 2));
