import { describe, expect, it } from "vitest";
import { sanitizeExportFilename } from "../client/src/lib/event-export";

describe("event analysis export", () => {
  it("removes forbidden filename characters without discarding Chinese titles", () => {
    expect(sanitizeExportFilename('併購／評估:甲<乙>?*|"')).toBe("併購-評估-甲-乙-----");
  });

  it("returns a safe fallback and enforces the 80-character limit", () => {
    expect(sanitizeExportFilename("  ")).toBe("孫子兵法-Match-Mapping");
    expect(Array.from(sanitizeExportFilename("策".repeat(100))).length).toBe(80);
  });
});
