import { chapterStatsFromSegments, formatReadingStats } from "../shared/chapter-reading-stats";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";
import { SUNZI_LOCALES } from "../shared/sunzi-locales";
import { chapterPath, localizedChapterPath } from "../shared/sunzi-seo";
import { SUNZI_TRANSLATIONS } from "../shared/sunzi-translations";

const base = (process.env.BASE || "http://localhost:4101").replace(/\/$/, "");
const routes = [
  ...SUNZI_CHAPTERS.map(chapter => {
    const labels = formatReadingStats(chapterStatsFromSegments(chapter.segments, "zh-Hant"), "zh-Hant");
    return { path: chapterPath(chapter), count: labels.count, time: labels.time };
  }),
  ...SUNZI_LOCALES.flatMap(locale => SUNZI_CHAPTERS.map((chapter, index) => {
    const translation = SUNZI_TRANSLATIONS[locale][index];
    const labels = formatReadingStats(chapterStatsFromSegments(translation.segments, locale), locale);
    return { path: localizedChapterPath(locale, chapter), count: labels.count, time: labels.time };
  })),
];

let cursor = 0;
let passed = 0;
const failures: string[] = [];

async function check(route: (typeof routes)[number]) {
  const response = await fetch(`${base}${route.path}`, { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } });
  const html = await response.text();
  const missing = [
    response.status === 200 ? null : `status=${response.status}`,
    html.includes(route.count) ? null : `count=${route.count}`,
    html.includes(route.time) ? null : `time=${route.time}`,
  ].filter(Boolean);
  if (missing.length) failures.push(`${route.path}: ${missing.join(", ")}`);
  else passed += 1;
}

const workers = Array.from({ length: 8 }, async () => {
  while (cursor < routes.length) await check(routes[cursor++]);
});

await Promise.all(workers);
console.log(JSON.stringify({ base, total: routes.length, passed, failed: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
