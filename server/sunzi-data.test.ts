import { describe, expect, it } from "vitest";
import { SUNZI_CHAPTERS, SUNZI_SOURCE } from "../shared/sunzi-data";

const EXPECTED_TITLES = [
  "始計", "作戰", "謀攻", "軍形", "兵勢", "虛實", "軍爭",
  "九變", "行軍", "地形", "九地", "火攻", "用間",
];

describe("SUNZI_CHAPTERS", () => {
  it("contains exactly the canonical thirteen chapters in order", () => {
    expect(SUNZI_CHAPTERS).toHaveLength(13);
    expect(SUNZI_CHAPTERS.map((chapter) => chapter.title)).toEqual(EXPECTED_TITLES);
    expect(SUNZI_CHAPTERS.some((chapter) => chapter.title.includes("答話"))).toBe(false);
  });

  it("uses unique stable segment ids and valid point references", () => {
    const ids = SUNZI_CHAPTERS.flatMap((chapter) => chapter.segments.map((segment) => segment.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(74);

    for (const chapter of SUNZI_CHAPTERS) {
      const ownIds = new Set(chapter.segments.map((segment) => segment.id));
      expect(chapter.summary.length).toBeGreaterThan(100);
      expect(chapter.points.length).toBeGreaterThanOrEqual(4);
      for (const point of chapter.points) expect(ownIds.has(point.segmentId)).toBe(true);
    }
  });

  it("pins the declared source revision and license", () => {
    expect(SUNZI_SOURCE.oldid).toBe("7906064");
    expect(SUNZI_SOURCE.license).toBe("CC BY-SA 4.0");
  });
});
