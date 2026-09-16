import { SUNZI_CHAPTERS, type SunziChapter } from "./sunzi-data";
import { SUNZI_LOCALES, type SunziLocale } from "./sunzi-locales";
import { chapterPath, localizedChapterPath } from "./sunzi-seo";

export const READING_PROGRESS_STORAGE_KEY = "sunzi:reading-progress:v1";
export const READING_PROGRESS_VERSION = 1 as const;
export type SunziReadingLocale = "zh-Hant" | SunziLocale;

export type SunziReadingProgress = {
  version: typeof READING_PROGRESS_VERSION;
  visitedChapterNumbers: number[];
  currentChapterNumber: number | null;
  currentLocale: SunziReadingLocale;
  updatedAt: number | null;
};

const validLocales = new Set<SunziReadingLocale>(["zh-Hant", ...SUNZI_LOCALES]);

export function emptyReadingProgress(): SunziReadingProgress {
  return {
    version: READING_PROGRESS_VERSION,
    visitedChapterNumbers: [],
    currentChapterNumber: null,
    currentLocale: "zh-Hant",
    updatedAt: null,
  };
}

function validChapterNumber(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= SUNZI_CHAPTERS.length;
}

export function normalizeReadingProgress(value: unknown): SunziReadingProgress {
  if (!value || typeof value !== "object") return emptyReadingProgress();
  const source = value as Partial<SunziReadingProgress>;
  const visited = Array.isArray(source.visitedChapterNumbers)
    ? Array.from(new Set(source.visitedChapterNumbers.filter(validChapterNumber))).sort((a, b) => a - b)
    : [];
  const currentChapterNumber = validChapterNumber(source.currentChapterNumber)
    ? source.currentChapterNumber
    : (visited.at(-1) ?? null);
  const currentLocale = typeof source.currentLocale === "string" && validLocales.has(source.currentLocale as SunziReadingLocale)
    ? source.currentLocale as SunziReadingLocale
    : "zh-Hant";
  const updatedAt = typeof source.updatedAt === "number" && Number.isFinite(source.updatedAt) && source.updatedAt > 0
    ? source.updatedAt
    : null;
  return {
    version: READING_PROGRESS_VERSION,
    visitedChapterNumbers: visited,
    currentChapterNumber,
    currentLocale,
    updatedAt,
  };
}

export function parseReadingProgress(value: string | null): SunziReadingProgress {
  if (!value) return emptyReadingProgress();
  try {
    return normalizeReadingProgress(JSON.parse(value));
  } catch {
    return emptyReadingProgress();
  }
}

export function visitReadingChapter(
  progress: SunziReadingProgress,
  chapterNumber: number,
  locale: SunziReadingLocale,
  updatedAt = Date.now(),
): SunziReadingProgress {
  if (!validChapterNumber(chapterNumber)) return normalizeReadingProgress(progress);
  return normalizeReadingProgress({
    ...progress,
    visitedChapterNumbers: [...progress.visitedChapterNumbers, chapterNumber],
    currentChapterNumber: chapterNumber,
    currentLocale: locale,
    updatedAt,
  });
}

export function currentReadingChapter(progress: SunziReadingProgress): SunziChapter | null {
  if (!progress.currentChapterNumber) return null;
  return SUNZI_CHAPTERS[progress.currentChapterNumber - 1] ?? null;
}

export function readingPositionPercent(progress: SunziReadingProgress) {
  return progress.currentChapterNumber
    ? Math.round((progress.currentChapterNumber / SUNZI_CHAPTERS.length) * 100)
    : 0;
}

export function readingResumePath(progress: SunziReadingProgress, locale: SunziReadingLocale = progress.currentLocale) {
  const chapter = currentReadingChapter(progress) ?? SUNZI_CHAPTERS[0];
  return locale === "zh-Hant" ? chapterPath(chapter) : localizedChapterPath(locale, chapter);
}

export function resetReadingProgress(progress: SunziReadingProgress) {
  return {
    previous: normalizeReadingProgress(progress),
    cleared: emptyReadingProgress(),
  };
}

export function restoreReadingProgress(previous: SunziReadingProgress) {
  return normalizeReadingProgress(previous);
}
