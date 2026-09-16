import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";
import { chapterRouteSlug } from "../shared/sunzi-seo";

const outputDir = "/home/ubuntu/webdev-static-assets/sunzi-og";
const logoPath = path.resolve("client/public/brand/sunzi-logo-512.png");
const logoDataUri = `data:image/png;base64,${(await readFile(logoPath)).toString("base64")}`;

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(value: string, max: number) {
  const chars = Array.from(value.replace(/\s+/g, " ").trim());
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("")}…`;
}

function wrap(value: string, width: number, maxLines = 2) {
  const chars = Array.from(value.replace(/\s+/g, " ").trim());
  const lines: string[] = [];
  while (chars.length && lines.length < maxLines) lines.push(chars.splice(0, width).join(""));
  if (chars.length && lines.length) lines[lines.length - 1] = truncate(lines[lines.length - 1], Math.max(1, width - 1)) + "…";
  return lines;
}

function baseSvg(content: string, accent = "#8f3224") {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="17" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="gray"/><feComponentTransfer in="gray"><feFuncA type="table" tableValues="0 0.055"/></feComponentTransfer></filter>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8dcc6"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#wash)"/>
  <rect width="1200" height="630" filter="url(#paper)" opacity="0.65"/>
  <rect x="34" y="34" width="1132" height="562" fill="none" stroke="#c3b18f" stroke-width="2"/>
  <rect x="54" y="54" width="6" height="522" fill="${accent}"/>
  ${content}
  </svg>`;
}

function commonFooter(pathLabel: string) {
  return `<text x="95" y="556" font-family="Noto Sans CJK TC, sans-serif" font-size="20" fill="#6f6b61">原文 · 篇旨今譯 · 要義提點 · 多語翻譯 · AI 問答</text>
  <text x="1105" y="556" text-anchor="end" font-family="Noto Sans CJK TC, sans-serif" font-size="18" fill="#8f3224">${escapeXml(pathLabel)}</text>`;
}

async function renderHome() {
  const svg = baseSvg(`<image href="${logoDataUri}" x="95" y="82" width="86" height="86"/>
  <text x="204" y="111" font-family="Noto Sans CJK TC, sans-serif" font-size="18" font-weight="700" letter-spacing="6" fill="#8f3224">武經七書 · 十三篇</text>
  <text x="95" y="292" font-family="Noto Serif CJK TC, serif" font-size="88" font-weight="700" letter-spacing="14" fill="#20241f">孫子兵法</text>
  <text x="99" y="360" font-family="Noto Serif CJK TC, serif" font-size="30" fill="#57584f">兵者，國之大事，死生之地，存亡之道，不可不察也。</text>
  <g transform="translate(95 410)"><rect width="920" height="78" fill="#fbf5e9" stroke="#c9b99b"/><text x="55" y="50" font-family="Noto Serif CJK TC, serif" font-size="34" font-weight="700" fill="#20241f">十三篇</text><line x1="250" y1="0" x2="250" y2="78" stroke="#c9b99b"/><text x="315" y="50" font-family="Noto Serif CJK TC, serif" font-size="34" font-weight="700" fill="#20241f">74 段</text><line x1="520" y1="0" x2="520" y2="78" stroke="#c9b99b"/><text x="585" y="50" font-family="Noto Serif CJK TC, serif" font-size="34" font-weight="700" fill="#20241f">64 則要義</text></g>
  ${commonFooter("sunziaow.manus.space")}`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, "og-home.png"));
}

async function renderChapter(chapter: (typeof SUNZI_CHAPTERS)[number]) {
  const quote = wrap(chapter.segments[0].text, 30, 2);
  const accent = ["#8f3224", "#6f4f25", "#31533a"][chapter.number % 3];
  const quoteText = quote.map((line, index) => `<text x="98" y="${398 + index * 45}" font-family="Noto Serif CJK TC, serif" font-size="28" fill="#504f47">${escapeXml(line)}</text>`).join("");
  const tags = chapter.tags.slice(0, 5).map((tag, index) => `<g transform="translate(${98 + index * 122} 286)"><rect width="106" height="38" fill="none" stroke="#a89675"/><text x="53" y="26" text-anchor="middle" font-family="Noto Sans CJK TC, sans-serif" font-size="17" fill="#655f54">${escapeXml(tag)}</text></g>`).join("");
  const svg = baseSvg(`<text x="96" y="105" font-family="Noto Sans CJK TC, sans-serif" font-size="18" font-weight="700" letter-spacing="5" fill="${accent}">《孫子兵法》十三篇線上讀本</text>
  <image href="${logoDataUri}" x="1028" y="70" width="72" height="72"/>
  <text x="1102" y="236" text-anchor="end" font-family="Noto Serif CJK TC, serif" font-size="102" font-weight="700" fill="${accent}" opacity="0.14">${String(chapter.number).padStart(2, "0")}</text>
  <text x="94" y="240" font-family="Noto Serif CJK TC, serif" font-size="78" font-weight="700" letter-spacing="10" fill="#20241f">${escapeXml(chapter.fullTitle)}</text>
  <text x="98" y="274" font-family="Noto Sans CJK TC, sans-serif" font-size="18" letter-spacing="5" fill="${accent}">${escapeXml(chapter.group)} · ${chapter.segments.length} 段 · ${chapter.points.length} 則要義</text>
  ${tags}
  <line x1="98" y1="357" x2="1100" y2="357" stroke="#c9b99b"/>
  ${quoteText}
  <text x="98" y="500" font-family="Noto Sans CJK TC, sans-serif" font-size="18" fill="#8f3224">固定底本 · ${escapeXml(chapter.segments[0].id)} · oldid 7906064</text>
  ${commonFooter(`/${chapterRouteSlug(chapter)}`)}`, accent);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, `og-${chapterRouteSlug(chapter)}.png`));
}

await mkdir(outputDir, { recursive: true });
await renderHome();
for (const chapter of SUNZI_CHAPTERS) await renderChapter(chapter);
console.log(`Generated ${SUNZI_CHAPTERS.length + 1} OG images in ${outputDir}`);
