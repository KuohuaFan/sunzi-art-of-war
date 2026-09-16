import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { buildCandidateCatalog, eventDraftSchema, validateMappingResponse } from "./routers/events";

function sampleResponse(keys: string[]) {
  return {
    situationSummary: "本方正在評估一項新服務，現有資訊與人力仍有限。",
    objective: "在可控風險下判斷是否進入下一階段。",
    unknowns: ["需求是否可被驗證", "團隊負荷上限"],
    interests: ["提早取得市場回饋", "避免長期資源消耗"],
    risks: ["依不完整資訊投入", "延遲造成機會成本"],
    caution: "這是決策檢查，不是成功率預測。",
    matches: keys.map(candidateKey => ({
      candidateKey,
      reason: "事件特徵與此原則相關。",
      application: "先補足關鍵資料並設置可逆測試。",
      limits: "不得由此直接推論事件必然成功。",
      confidence: "medium" as const,
      missingInfo: "仍需查證具體資源限制。",
    })),
  };
}

describe("event Match Mapping validation", () => {
  it("builds 64 traceable candidates from the fixed chapter points", () => {
    const candidates = buildCandidateCatalog();
    expect(candidates).toHaveLength(64);
    expect(new Set(candidates.map(item => item.key)).size).toBe(64);
    expect(candidates.every(item => item.quote.length > 0 && /^\d{2}-\d{2}$/.test(item.segmentId))).toBe(true);
  });

  it("accepts three candidates and fills canonical ranks and quotes on the server", () => {
    const candidates = buildCandidateCatalog();
    const result = validateMappingResponse(sampleResponse(candidates.slice(0, 3).map(item => item.key)), candidates);
    expect(result.matches.map(item => item.rank)).toEqual([1, 2, 3]);
    expect(result.matches[0]?.quote).toBe(candidates[0]?.quote);
    expect(result.matches[0]?.segmentId).toBe(candidates[0]?.segmentId);
  });

  it("rejects unknown or duplicate candidate keys", () => {
    const candidates = buildCandidateCatalog();
    expect(() => validateMappingResponse(sampleResponse([candidates[0].key, candidates[1].key, "99-99::不存在"]), candidates)).toThrow(/不存在/);
    expect(() => validateMappingResponse(sampleResponse([candidates[0].key, candidates[0].key, candidates[1].key]), candidates)).toThrow(/重複/);
  });

  it("requires substantial facts and a concrete goal", () => {
    const parsed = eventDraftSchema.safeParse({
      title: "新服務評估",
      stage: "proposed",
      sensitivity: "confidential",
      facts: "太短",
      goal: "成功",
      stakeholders: "",
      resources: "",
      constraints: "",
      knownRisks: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("event privacy", () => {
  it("rejects event listing without a signed-in user before touching the database", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(caller.events.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
