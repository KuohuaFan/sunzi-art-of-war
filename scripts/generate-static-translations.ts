import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUNZI_CHAPTERS, SUNZI_SOURCE } from "../shared/sunzi-data";
import { SUNZI_LOCALE_CONFIG, SUNZI_LOCALES, type SunziLocale } from "../shared/sunzi-locales";

type Translation = {
  chapterNumber: number;
  chapterTitle: string;
  fullTitle: string;
  group: string;
  summary: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  segments: Array<{ id: string; text: string }>;
  points: Array<{ title: string; body: string; segmentId: string }>;
};

type Output = {
  model: string;
  sourceOldid: string;
  generatedAt: string;
  translations: Record<SunziLocale, Translation[]>;
};

const model = "gpt-5-mini";
const apiBase = process.env.OPENAI_API_BASE?.replace(/\/$/, "");
const apiKey = process.env.OPENAI_API_KEY;
if (!apiBase || !apiKey) throw new Error("OPENAI_API_BASE and OPENAI_API_KEY are required");

const outputDir = path.resolve("content/generated");
const jsonPath = path.join(outputDir, "sunzi-translations.json");
const tsPath = path.resolve("shared/sunzi-translations.ts");

const schema = {
  type: "object",
  properties: {
    chapterNumber: { type: "integer" },
    chapterTitle: { type: "string" },
    fullTitle: { type: "string" },
    group: { type: "string" },
    summary: { type: "string" },
    tags: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    segments: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"], additionalProperties: false } },
    points: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, segmentId: { type: "string" } }, required: ["title", "body", "segmentId"], additionalProperties: false } },
  },
  required: ["chapterNumber", "chapterTitle", "fullTitle", "group", "summary", "tags", "seoTitle", "seoDescription", "segments", "points"],
  additionalProperties: false,
};

async function loadExisting(): Promise<Output> {
  try {
    return JSON.parse(await readFile(jsonPath, "utf8")) as Output;
  } catch {
    return {
      model,
      sourceOldid: SUNZI_SOURCE.oldid,
      generatedAt: new Date().toISOString(),
      translations: Object.fromEntries(SUNZI_LOCALES.map(locale => [locale, []])) as Record<SunziLocale, Translation[]>,
    };
  }
}

function validate(locale: SunziLocale, chapterIndex: number, value: Translation) {
  const chapter = SUNZI_CHAPTERS[chapterIndex];
  if (value.chapterNumber !== chapter.number) throw new Error("chapter number mismatch");
  const expectedSegments = chapter.segments.map(item => item.id);
  const actualSegments = value.segments.map(item => item.id);
  if (JSON.stringify(actualSegments) !== JSON.stringify(expectedSegments)) throw new Error("segment IDs or order mismatch");
  const expectedPoints = chapter.points.map(item => item.segmentId);
  const actualPoints = value.points.map(item => item.segmentId);
  if (JSON.stringify(actualPoints) !== JSON.stringify(expectedPoints)) throw new Error("point anchors or order mismatch");
  const strings = [value.chapterTitle, value.fullTitle, value.group, value.summary, value.seoTitle, value.seoDescription, ...value.tags, ...value.segments.map(item => item.text), ...value.points.flatMap(item => [item.title, item.body])];
  if (strings.some(item => !item.trim())) throw new Error("empty translated field");
  if (Array.from(value.seoTitle).length > 70) throw new Error("SEO title exceeds 70 characters");
  const descriptionLength = Array.from(value.seoDescription).length;
  if (descriptionLength < 50 || descriptionLength > 160) throw new Error(`SEO description length ${descriptionLength} outside 50–160`);
  if (["en", "es", "fr", "de"].includes(locale)) {
    const joined = strings.join(" ");
    const hanCount = (joined.match(/[\u3400-\u9fff]/g) ?? []).length;
    if (hanCount > 2) throw new Error(`unexpected untranslated Han characters: ${hanCount}`);
  }
}

async function translate(locale: SunziLocale, chapterIndex: number): Promise<Translation> {
  const chapter = SUNZI_CHAPTERS[chapterIndex];
  const config = SUNZI_LOCALE_CONFIG[locale];
  const source = {
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    fullTitle: chapter.fullTitle,
    group: chapter.group,
    summary: chapter.summary,
    tags: chapter.tags,
    segments: chapter.segments,
    points: chapter.points,
  };
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          response_format: { type: "json_schema", json_schema: { name: "sunzi_static_translation", strict: true, schema } },
          messages: [
            {
              role: "system",
              content: `You are a professional translator of classical Chinese into ${config.nativeName}. Produce accurate, readable modern-language prose. Preserve the exact number, order, IDs and segmentId anchors. Translate the editorial summary, group label, tags and key-point commentary as editorial material, not as quotations from Sun Tzu. Translate every source passage fully; do not omit, merge, embellish or add tactical instructions. Create a natural SEO title no longer than 70 characters. Create a focused SEO description between 80 and 140 Unicode characters; it must never be shorter than 70 or longer than 150 characters. Use only the target language except unavoidable proper names. Output JSON only.`,
            },
            { role: "user", content: JSON.stringify(source) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("empty model response");
      const value = JSON.parse(content) as Translation;
      validate(locale, chapterIndex, value);
      return value;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error(`${locale}/${chapter.number} failed: ${String(lastError)}`);
}

async function save(output: Output) {
  output.generatedAt = new Date().toISOString();
  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  const ts = `import type { SunziLocale } from "./sunzi-locales";\n\nexport type SunziTranslatedChapter = {\n  chapterNumber: number;\n  chapterTitle: string;\n  fullTitle: string;\n  group: string;\n  summary: string;\n  tags: string[];\n  seoTitle: string;\n  seoDescription: string;\n  segments: Array<{ id: string; text: string }>;\n  points: Array<{ title: string; body: string; segmentId: string }>;\n};\n\nexport const SUNZI_TRANSLATION_META = ${JSON.stringify({ model: output.model, sourceOldid: output.sourceOldid, generatedAt: output.generatedAt }, null, 2)} as const;\n\nexport const SUNZI_TRANSLATIONS: Record<SunziLocale, SunziTranslatedChapter[]> = ${JSON.stringify(output.translations, null, 2)};\n`;
  await writeFile(tsPath, ts);
}

async function main() {
  const output = await loadExisting();
  const queue = SUNZI_LOCALES.flatMap(locale => SUNZI_CHAPTERS.map((_, chapterIndex) => ({ locale, chapterIndex })))
    .filter(({ locale, chapterIndex }) => !output.translations[locale]?.[chapterIndex]);
  console.log(`Generating ${queue.length} translations with ${model}`);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, queue.length || 1) }, async (_, workerIndex) => {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      console.log(`[worker ${workerIndex + 1}] ${item.locale} chapter ${item.chapterIndex + 1}`);
      const value = await translate(item.locale, item.chapterIndex);
      output.translations[item.locale][item.chapterIndex] = value;
      await save(output);
    }
  });
  await Promise.all(workers);
  for (const locale of SUNZI_LOCALES) {
    if (output.translations[locale].length !== SUNZI_CHAPTERS.length || output.translations[locale].some((value, index) => !value || value.chapterNumber !== index + 1)) throw new Error(`incomplete locale ${locale}`);
  }
  await save(output);
  console.log(`Wrote ${jsonPath} and ${tsPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
