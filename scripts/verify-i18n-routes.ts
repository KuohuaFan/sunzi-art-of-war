import { SUNZI_CHAPTERS } from "../shared/sunzi-data";
import { SUNZI_LOCALES } from "../shared/sunzi-locales";
import { localizedChapterPath, localizedHomePath } from "../shared/sunzi-seo";
import { SUNZI_TRANSLATIONS } from "../shared/sunzi-translations";

const base = (process.env.BASE || "http://localhost:4101").replace(/\/$/, "");
const routes = SUNZI_LOCALES.flatMap(locale => [
  { locale, path: localizedHomePath(locale), needle: SUNZI_TRANSLATIONS[locale][0].fullTitle },
  ...SUNZI_CHAPTERS.map((chapter, index) => ({ locale, path: localizedChapterPath(locale, chapter), needle: SUNZI_TRANSLATIONS[locale][index].segments[0].text.slice(0, 36) })),
]);

let cursor = 0;
const failures: string[] = [];
let passed = 0;

async function check(route: (typeof routes)[number]) {
  const response = await fetch(`${base}${route.path}`, { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }, redirect: "manual" });
  const html = await response.text();
  const decodedHtml = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
  const canonical = `${base}${route.path}`;
  const checks: Array<[string, boolean]> = [
    ["status", response.status === 200],
    ["lang", html.includes(`<html lang="${route.locale}">`)],
    ["body", decodedHtml.includes(route.needle)],
    ["canonical", html.includes(`<link rel="canonical" href="${canonical}" />`)],
    ["no-noindex", !/<meta[^>]+name="robots"[^>]+noindex/i.test(html)],
    ["og-locale", html.includes('property="og:locale"')],
    ["x-default", html.includes('rel="alternate" hreflang="x-default"')],
  ];
  const alternates = html.match(/<link rel="alternate" hreflang=/g)?.length ?? 0;
  checks.push(["alternates=8", alternates === 8]);
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) failures.push(`${route.path}: ${failed.join(", ")}`);
  else passed += 1;
}

const workers = Array.from({ length: 8 }, async () => {
  while (cursor < routes.length) {
    const route = routes[cursor++];
    await check(route);
  }
});

await Promise.all(workers);
console.log(JSON.stringify({ base, total: routes.length, passed, failed: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
