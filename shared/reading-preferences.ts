import { chapterStatsFromSegments, defaultReadingRate, type ChapterReadingStats } from "./chapter-reading-stats";
import type { SunziReadingLocale } from "./reading-progress";

export const READING_PREFERENCES_STORAGE_KEY = "sunzi:reading-preferences:v1";
export const MIN_CALIBRATION_SECONDS = 20;

export type ReadingSpeedSample = {
  ratePerMinute: number;
  sampleCount: number;
  updatedAt: number;
};

export type ReadingPreferences = {
  version: 1;
  speeds: Partial<Record<SunziReadingLocale, ReadingSpeedSample>>;
};

export type ChapterSortMode = "canonical" | "shortest";
export type ReadingTimeLimit = 0 | 1 | 2 | 3 | 5 | 10;

export function emptyReadingPreferences(): ReadingPreferences {
  return { version: 1, speeds: {} };
}

function normalizeSample(value: unknown, locale: SunziReadingLocale): ReadingSpeedSample | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<ReadingSpeedSample>;
  const rate = Number(source.ratePerMinute);
  const sampleCount = Number(source.sampleCount);
  const updatedAt = Number(source.updatedAt);
  const baseline = defaultReadingRate(locale);
  if (!Number.isFinite(rate) || !Number.isInteger(sampleCount) || sampleCount < 1 || !Number.isFinite(updatedAt)) return undefined;
  if (rate < baseline * 0.25 || rate > baseline * 3) return undefined;
  return { ratePerMinute: Math.round(rate), sampleCount: Math.min(sampleCount, 30), updatedAt: Math.max(0, Math.floor(updatedAt)) };
}

export function normalizeReadingPreferences(value: unknown): ReadingPreferences {
  if (!value || typeof value !== "object") return emptyReadingPreferences();
  const source = value as { speeds?: unknown };
  const speeds: ReadingPreferences["speeds"] = {};
  const candidates = source.speeds && typeof source.speeds === "object" ? source.speeds as Record<string, unknown> : {};
  (["zh-Hant", "en", "ja", "ko", "es", "fr", "de"] as SunziReadingLocale[]).forEach(locale => {
    const sample = normalizeSample(candidates[locale], locale);
    if (sample) speeds[locale] = sample;
  });
  return { version: 1, speeds };
}

export function parseReadingPreferences(raw: string | null) {
  if (!raw) return emptyReadingPreferences();
  try {
    return normalizeReadingPreferences(JSON.parse(raw));
  } catch {
    return emptyReadingPreferences();
  }
}

export function readingRateForLocale(preferences: ReadingPreferences, locale: SunziReadingLocale) {
  return preferences.speeds[locale]?.ratePerMinute;
}

export function recordReadingSample(
  preferences: ReadingPreferences,
  locale: SunziReadingLocale,
  unitCount: number,
  elapsedSeconds: number,
  updatedAt = Date.now(),
): ReadingPreferences {
  if (!Number.isFinite(unitCount) || unitCount <= 0 || !Number.isFinite(elapsedSeconds) || elapsedSeconds < MIN_CALIBRATION_SECONDS) return preferences;
  const baseline = defaultReadingRate(locale);
  const observed = unitCount / (elapsedSeconds / 60);
  const bounded = Math.min(baseline * 3, Math.max(baseline * 0.25, observed));
  const existing = preferences.speeds[locale];
  const previousWeight = Math.min(existing?.sampleCount ?? 0, 29);
  const ratePerMinute = Math.round(((existing?.ratePerMinute ?? 0) * previousWeight + bounded) / (previousWeight + 1));
  return {
    version: 1,
    speeds: {
      ...preferences.speeds,
      [locale]: { ratePerMinute, sampleCount: previousWeight + 1, updatedAt },
    },
  };
}

export function resetReadingSpeed(preferences: ReadingPreferences, locale: SunziReadingLocale): ReadingPreferences {
  const speeds = { ...preferences.speeds };
  delete speeds[locale];
  return { version: 1, speeds };
}

export type PlannableChapter<T> = {
  item: T;
  originalIndex: number;
  stats: ChapterReadingStats;
};

export function planChapters<T extends { segments: readonly { text: string }[] }>(
  items: readonly T[],
  locale: SunziReadingLocale,
  customRate: number | undefined,
  sortMode: ChapterSortMode,
  timeLimit: ReadingTimeLimit,
): Array<PlannableChapter<T>> {
  const planned = items.map((item, originalIndex) => ({
    item,
    originalIndex,
    stats: chapterStatsFromSegments(item.segments, locale, customRate),
  })).filter(entry => timeLimit === 0 || entry.stats.minutes <= timeLimit);

  if (sortMode === "shortest") {
    planned.sort((left, right) => left.stats.minutes - right.stats.minutes || left.stats.unitCount - right.stats.unitCount || left.originalIndex - right.originalIndex);
  }
  return planned;
}
