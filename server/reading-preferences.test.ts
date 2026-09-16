import { describe, expect, it } from "vitest";
import { chapterReadingStats } from "../shared/chapter-reading-stats";
import {
  emptyReadingPreferences,
  normalizeReadingPreferences,
  parseReadingPreferences,
  planChapters,
  readingRateForLocale,
  recordReadingSample,
  resetReadingSpeed,
} from "../shared/reading-preferences";

const chapters = [
  { id: 1, segments: [{ text: "word ".repeat(450) }] },
  { id: 2, segments: [{ text: "word ".repeat(100) }] },
  { id: 3, segments: [{ text: "word ".repeat(225) }] },
];

describe("reading preferences", () => {
  it("recovers safely from malformed storage", () => {
    expect(parseReadingPreferences("not-json")).toEqual(emptyReadingPreferences());
    expect(normalizeReadingPreferences({ speeds: { en: { ratePerMinute: -1, sampleCount: 0 } } })).toEqual(emptyReadingPreferences());
  });

  it("records and averages actual timed samples per locale", () => {
    const first = recordReadingSample(emptyReadingPreferences(), "en", 450, 120, 1000);
    expect(readingRateForLocale(first, "en")).toBe(225);
    const second = recordReadingSample(first, "en", 300, 60, 2000);
    expect(readingRateForLocale(second, "en")).toBe(263);
    expect(second.speeds.en?.sampleCount).toBe(2);
    expect(readingRateForLocale(second, "ja")).toBeUndefined();
  });

  it("ignores calibration attempts shorter than twenty seconds and clamps implausible rates", () => {
    const empty = emptyReadingPreferences();
    expect(recordReadingSample(empty, "zh-Hant", 300, 19)).toBe(empty);
    expect(readingRateForLocale(recordReadingSample(empty, "en", 10000, 20), "en")).toBe(675);
  });

  it("resets only the selected locale speed", () => {
    const en = recordReadingSample(emptyReadingPreferences(), "en", 225, 60);
    const withJa = recordReadingSample(en, "ja", 400, 60);
    const reset = resetReadingSpeed(withJa, "en");
    expect(readingRateForLocale(reset, "en")).toBeUndefined();
    expect(readingRateForLocale(reset, "ja")).toBe(400);
  });

  it("uses a custom speed when estimating a chapter", () => {
    expect(chapterReadingStats(["word ".repeat(450)], "en").minutes).toBe(2);
    expect(chapterReadingStats(["word ".repeat(450)], "en", 150).minutes).toBe(3);
  });

  it("filters by maximum minutes and sorts shortest chapters first", () => {
    const planned = planChapters(chapters, "en", undefined, "shortest", 1);
    expect(planned.map(entry => entry.item.id)).toEqual([2, 3]);
    expect(planChapters(chapters, "en", undefined, "canonical", 0).map(entry => entry.item.id)).toEqual([1, 2, 3]);
  });
});
