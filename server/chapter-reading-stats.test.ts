import { describe, expect, it } from "vitest";
import { chapterReadingStats, chapterStatsFromSegments, countReadingUnits, formatReadingStats } from "../shared/chapter-reading-stats";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";
import { SUNZI_LOCALES } from "../shared/sunzi-locales";
import { SUNZI_TRANSLATIONS } from "../shared/sunzi-translations";


describe("chapter reading stats", () => {
  it("counts visible CJK characters and Latin words with contractions", () => {
    expect(countReadingUnits("孫子曰：兵者，國之大事。", "zh-Hant")).toBe(12);
    expect(countReadingUnits("Sun Tzu's well-tested plan.", "en")).toBe(4);
    expect(countReadingUnits("兵法を読む。", "ja")).toBe(6);
  });

  it("rounds reading time upward with a minimum of one minute", () => {
    expect(chapterReadingStats(["兵法"], "zh-Hant").minutes).toBe(1);
    expect(chapterReadingStats(["word ".repeat(226)], "en").minutes).toBe(2);
  });

  it("uses a custom rate and labels the estimate as personalized", () => {
    const stats = chapterReadingStats(["word ".repeat(450)], "en", 150);
    expect(stats.minutes).toBe(3);
    expect(formatReadingStats(stats, "en", true).note).toContain("Personalized");
    expect(formatReadingStats(chapterReadingStats(["兵".repeat(600)], "zh-Hant", 200), "zh-Hant", true).note).toContain("個人化估算");
  });

  it("calculates positive, plausible stats for all 13 Chinese chapters", () => {
    SUNZI_CHAPTERS.forEach(chapter => {
      const stats = chapterStatsFromSegments(chapter.segments, "zh-Hant");
      expect(stats.unitCount).toBe(chapter.charCount);
      expect(stats.minutes).toBeGreaterThanOrEqual(1);
      expect(stats.minutes).toBeLessThanOrEqual(8);
    });
  });

  it("calculates positive stats and localized labels for all 78 translations", () => {
    SUNZI_LOCALES.forEach(locale => {
      SUNZI_TRANSLATIONS[locale].forEach(chapter => {
        const stats = chapterStatsFromSegments(chapter.segments, locale);
        const labels = formatReadingStats(stats, locale);
        expect(stats.unitCount).toBeGreaterThan(0);
        expect(stats.minutes).toBeGreaterThanOrEqual(1);
        expect(labels.count).toMatch(/\d/);
        expect(labels.time).toMatch(/\d/);
      });
    });
  });
});
