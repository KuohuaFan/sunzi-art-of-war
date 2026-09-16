import { describe, expect, it } from "vitest";
import {
  emptyReadingProgress,
  normalizeReadingProgress,
  parseReadingProgress,
  readingPositionPercent,
  readingResumePath,
  resetReadingProgress,
  restoreReadingProgress,
  visitReadingChapter,
} from "../shared/reading-progress";

describe("reading progress", () => {
  it("falls back safely for missing or corrupted local storage values", () => {
    expect(parseReadingProgress(null)).toEqual(emptyReadingProgress());
    expect(parseReadingProgress("{not-json")).toEqual(emptyReadingProgress());
  });

  it("normalizes invalid chapters, duplicates, locale and timestamps", () => {
    expect(normalizeReadingProgress({
      version: 99,
      visitedChapterNumbers: [7, 2, 7, 0, 14, "3"],
      currentChapterNumber: 22,
      currentLocale: "xx",
      updatedAt: -1,
    })).toEqual({
      version: 1,
      visitedChapterNumbers: [2, 7],
      currentChapterNumber: 7,
      currentLocale: "zh-Hant",
      updatedAt: null,
    });
  });

  it("records visited chapters once while keeping the latest chapter and locale", () => {
    const first = visitReadingChapter(emptyReadingProgress(), 3, "zh-Hant", 1000);
    const second = visitReadingChapter(first, 1, "en", 2000);
    const third = visitReadingChapter(second, 3, "ja", 3000);
    expect(third).toEqual({
      version: 1,
      visitedChapterNumbers: [1, 3],
      currentChapterNumber: 3,
      currentLocale: "ja",
      updatedAt: 3000,
    });
  });

  it("builds language-aware resume paths and a chapter-position percentage", () => {
    const progress = visitReadingChapter(emptyReadingProgress(), 7, "en", 1000);
    expect(readingResumePath(progress)).toBe("/en/chapters/07-junzheng");
    expect(readingResumePath(progress, "zh-Hant")).toBe("/chapters/07-junzheng");
    expect(readingResumePath(progress, "fr")).toBe("/fr/chapters/07-junzheng");
    expect(readingPositionPercent(progress)).toBe(54);
  });

  it("keeps a safe snapshot so a reset can be undone", () => {
    const progress = visitReadingChapter(visitReadingChapter(emptyReadingProgress(), 2, "en", 1000), 5, "fr", 2000);
    const reset = resetReadingProgress(progress);
    expect(reset.cleared).toEqual(emptyReadingProgress());
    expect(restoreReadingProgress(reset.previous)).toEqual(progress);
  });
});
