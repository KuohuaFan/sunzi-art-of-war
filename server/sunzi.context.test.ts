import { describe, expect, it } from "vitest";
import { buildSearchCatalog, buildSunziContext } from "./routers/sunzi";


describe("buildSunziContext", () => {
  it("prioritizes an explicitly named chapter and preserves segment citations", () => {
    const context = buildSunziContext("知彼知己在謀攻篇的意思", 1);
    expect(context).toContain("〈謀攻〉");
    expect(context).toContain("03-08");
    expect(context).toContain("知彼知己");
  });

  it("includes current chapter context for a general question", () => {
    const context = buildSunziContext("這一篇的核心是什麼？", 12);
    expect(context).toContain("〈火攻〉");
    expect(context).toContain("12-01");
  });

  it("builds 64 unique, traceable semantic-search candidates", () => {
    const catalog = buildSearchCatalog();
    expect(catalog).toHaveLength(64);
    expect(new Set(catalog.map(item => item.key)).size).toBe(64);
    expect(new Set(catalog.map(item => item.aiKey)).size).toBe(64);
    for (const item of catalog) {
      expect(item.aiKey).toMatch(/^C\d{3}$/);
      expect(item.key).toBe(`${item.segmentId}::${item.principle}`);
      expect(item.quote.length).toBeGreaterThan(5);
    }
  });
});
