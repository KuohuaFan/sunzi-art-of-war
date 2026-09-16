import type { SunziReadingLocale } from "./reading-progress";

export type ChapterReadingStats = {
  unitCount: number;
  minutes: number;
  ratePerMinute: number;
  unit: "characters" | "words";
};

const READING_RATES: Record<SunziReadingLocale, number> = {
  "zh-Hant": 300,
  en: 225,
  ja: 400,
  ko: 250,
  es: 220,
  fr: 220,
  de: 200,
};

export function defaultReadingRate(locale: SunziReadingLocale) {
  return READING_RATES[locale];
}

const CHARACTER_COUNT_LOCALES = new Set<SunziReadingLocale>(["zh-Hant", "ja"]);
const WORD_PATTERN = new RegExp("[\\p{L}\\p{N}]+(?:[’'\\-][\\p{L}\\p{N}]+)*", "gu");

export function countReadingUnits(text: string, locale: SunziReadingLocale) {
  if (CHARACTER_COUNT_LOCALES.has(locale)) {
    return Array.from(text).filter(character => !/\s/.test(character)).length;
  }
  return text.match(WORD_PATTERN)?.length ?? 0;
}

export function chapterReadingStats(texts: readonly string[], locale: SunziReadingLocale, customRate?: number): ChapterReadingStats {
  const unitCount = texts.reduce((sum, text) => sum + countReadingUnits(text, locale), 0);
  const ratePerMinute = Number.isFinite(customRate) && Number(customRate) > 0 ? Math.round(Number(customRate)) : defaultReadingRate(locale);
  return {
    unitCount,
    minutes: Math.max(1, Math.ceil(unitCount / ratePerMinute)),
    ratePerMinute,
    unit: CHARACTER_COUNT_LOCALES.has(locale) ? "characters" : "words",
  };
}

export function formatReadingStats(stats: ChapterReadingStats, locale: SunziReadingLocale, personalized = false) {
  const languageTag = locale === "zh-Hant" ? "zh-TW" : locale;
  const count = new Intl.NumberFormat(languageTag).format(stats.unitCount);
  const copy: Record<SunziReadingLocale, { count: string; time: string; note: string }> = {
    "zh-Hant": { count: `${count} 字`, time: `約 ${stats.minutes} 分鐘`, note: `${personalized ? "個人化估算 · " : ""}僅計正文，每分鐘 ${stats.ratePerMinute} 字` },
    en: { count: `${count} words`, time: `${stats.minutes} min read`, note: `${personalized ? "Personalized · " : ""}Translated text only · ${stats.ratePerMinute} words per minute` },
    ja: { count: `${count} 文字`, time: `約 ${stats.minutes} 分`, note: `${personalized ? "個人推定・" : ""}訳文のみ・毎分${stats.ratePerMinute}文字` },
    ko: { count: `${count}단어`, time: `약 ${stats.minutes}분`, note: `${personalized ? "개인 맞춤 · " : ""}번역문만 계산 · 분당 ${stats.ratePerMinute}단어` },
    es: { count: `${count} palabras`, time: `Lectura: ${stats.minutes} min`, note: `${personalized ? "Personalizado · " : ""}Solo traducción · ${stats.ratePerMinute} palabras por minuto` },
    fr: { count: `${count} mots`, time: `Lecture : ${stats.minutes} min`, note: `${personalized ? "Personnalisé · " : ""}Traduction seule · ${stats.ratePerMinute} mots par minute` },
    de: { count: `${count} Wörter`, time: `Lesezeit: ${stats.minutes} Min.`, note: `${personalized ? "Personalisiert · " : ""}Nur Übersetzung · ${stats.ratePerMinute} Wörter pro Minute` },
  };
  return copy[locale];
}

export function chapterStatsFromSegments(segments: readonly { text: string }[], locale: SunziReadingLocale, customRate?: number) {
  return chapterReadingStats(segments.map(segment => segment.text), locale, customRate);
}
