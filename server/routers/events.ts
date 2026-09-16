import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SUNZI_CHAPTERS, SUNZI_SOURCE } from "../../shared/sunzi-data";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

const MODEL = "gpt-5";
const PROMPT_VERSION = "match-map-v1";

export const eventDraftSchema = z.object({
  title: z.string().trim().min(2, "事件名稱至少需要兩個字").max(160),
  stage: z.enum(["proposed", "active", "pending", "completed"]),
  sensitivity: z.enum(["normal", "confidential", "highly_confidential"]),
  facts: z.string().trim().min(20, "事件事實至少需要二十個字").max(5000),
  goal: z.string().trim().min(5, "請具體說明擬達成目標").max(2000),
  stakeholders: z.string().trim().max(2000).default(""),
  resources: z.string().trim().max(2000).default(""),
  constraints: z.string().trim().max(2000).default(""),
  knownRisks: z.string().trim().max(2000).default(""),
});

const mappingResponseSchema = z.object({
  situationSummary: z.string().min(1).max(1200),
  objective: z.string().min(1).max(800),
  unknowns: z.array(z.string().min(1).max(300)).min(2).max(6),
  interests: z.array(z.string().min(1).max(300)).min(2).max(6),
  risks: z.array(z.string().min(1).max(300)).min(2).max(6),
  caution: z.string().min(1).max(800),
  matches: z.array(z.object({
    candidateKey: z.string().min(1).max(180),
    reason: z.string().min(1).max(700),
    application: z.string().min(1).max(700),
    limits: z.string().min(1).max(500),
    confidence: z.enum(["high", "medium", "low"]),
    missingInfo: z.string().max(500),
  })).min(3).max(5),
});

export type MappingResponse = z.infer<typeof mappingResponseSchema>;

type Candidate = {
  key: string;
  chapterNumber: number;
  chapterTitle: string;
  segmentId: string;
  principle: string;
  body: string;
  quote: string;
};

export function buildCandidateCatalog(): Candidate[] {
  return SUNZI_CHAPTERS.flatMap(chapter => chapter.points.map(point => {
    const segment = chapter.segments.find(item => item.id === point.segmentId);
    if (!segment) throw new Error(`要義 ${point.title} 缺少有效段號`);
    return {
      key: `${point.segmentId}::${point.title}`,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      segmentId: point.segmentId,
      principle: point.title,
      body: point.body,
      quote: segment.text,
    };
  }));
}

export function validateMappingResponse(raw: unknown, candidates = buildCandidateCatalog()) {
  const parsed = mappingResponseSchema.parse(raw);
  const byKey = new Map(candidates.map(candidate => [candidate.key, candidate]));
  const seen = new Set<string>();
  const matches = parsed.matches.map((match, index) => {
    const candidate = byKey.get(match.candidateKey);
    if (!candidate) throw new Error(`模型回傳不存在的兵法候選：${match.candidateKey}`);
    if (seen.has(candidate.key)) throw new Error(`模型重複選擇兵法候選：${candidate.key}`);
    seen.add(candidate.key);
    return {
      rank: index + 1,
      chapterNumber: candidate.chapterNumber,
      segmentId: candidate.segmentId,
      principle: candidate.principle,
      quote: candidate.quote,
      reason: match.reason,
      application: match.application,
      limits: match.limits,
      confidence: match.confidence,
      missingInfo: match.missingInfo,
    };
  });
  return { ...parsed, matches };
}

const analysisWindows = new Map<number, { count: number; resetAt: number }>();
function allowAnalysis(userId: number) {
  const now = Date.now();
  const current = analysisWindows.get(userId);
  if (!current || current.resetAt <= now) {
    analysisWindows.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 4) return false;
  current.count += 1;
  return true;
}

function notFound(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "找不到事件，或您沒有存取權限。" });
}

function jsonSchema() {
  const text = (description: string) => ({ type: "string", description });
  const stringList = (description: string) => ({
    type: "array",
    description,
    items: { type: "string" },
    minItems: 2,
    maxItems: 6,
  });
  return {
    type: "object",
    properties: {
      situationSummary: text("中性、忠於輸入事實的情勢摘要，不加入未提供的事實"),
      objective: text("事件的主要目標；如目標含混，明確指出"),
      unknowns: stringList("採取行動前仍須查證的未知事項"),
      interests: stringList("行動與不行動的主要利益及代價"),
      risks: stringList("包含不可逆、法律倫理與組織風險"),
      caution: text("分析界線及需要專業人員覆核之處"),
      matches: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            candidateKey: text("只能逐字選用候選目錄中的 KEY"),
            reason: text("事件特徵與兵法原則相關的理由；不得宣稱成功率"),
            application: text("轉化為中性、合法、可檢查的問題或下一步；不得提供傷害、欺詐或規避責任的方法"),
            limits: text("此原則在本事件中的不適用界線與不可由原文推導的結論"),
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            missingInfo: text("最可能改變此匹配的待補資料；若無則回傳空字串"),
          },
          required: ["candidateKey", "reason", "application", "limits", "confidence", "missingInfo"],
          additionalProperties: false,
        },
      },
    },
    required: ["situationSummary", "objective", "unknowns", "interests", "risks", "caution", "matches"],
    additionalProperties: false,
  };
}

export async function generateMapping(input: db.EventDraft) {
  const candidates = buildCandidateCatalog();
  const catalog = candidates.map(candidate =>
    `KEY=${candidate.key}\n〈${candidate.chapterTitle}〉${candidate.segmentId}｜${candidate.principle}\n要義：${candidate.body}`,
  ).join("\n\n");

  const response = await invokeLLM({
    model: MODEL,
    reasoning: { effort: "low" },
    response_format: {
      type: "json_schema",
      json_schema: { name: "sunzi_event_mapping", strict: true, schema: jsonSchema() },
    },
    messages: [
      {
        role: "system",
        content: `你是《孫子兵法》十三篇的決策分析助手。你的任務是整理事件並從提供的候選目錄選出三至五個最相關原則。

強制規則：
一、只可選用候選目錄內完整 KEY；不得混入《三十六計》、後世兵法或網路語句。
二、不要輸出原文引句；伺服器會依 KEY 填入固定底本原文。
三、信心只表示輸入資料與原則的匹配充分度，絕不表示事件成功率或勝率。
四、保持「本方、他方、利害關係人」的中性措辭，不把一般合作或人際關係敵對化。
五、禁止提供暴力、傷害、欺詐、騷擾、跟蹤、非法侵入、規避法律或湮滅證據的具體方法；遇此類情境只能提供降級、合法替代與專業覆核建議。
六、法律、醫療、財務、僱用或人身安全事項必須提示適當專業人員覆核。
七、忠於使用者已提供事實。未提供的內容列為 unknowns，不得自行補成事實。
八、application 必須是可檢查的問題、資料蒐集或可逆下一步，不得假稱古典原文能直接決定現代事件。
九、請輸出符合 JSON Schema 的繁體中文。`,
      },
      {
        role: "user",
        content: `【事件】${input.title}
【階段】${input.stage}
【敏感度】${input.sensitivity}
【已知事實】${input.facts}
【擬達成目標】${input.goal}
【利害關係人】${input.stakeholders || "未提供"}
【可用資源】${input.resources || "未提供"}
【限制條件】${input.constraints || "未提供"}
【已知風險】${input.knownRisks || "未提供"}

【《孫子兵法》候選目錄】
${catalog}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") throw new Error("模型未回傳結構化內容");
  return validateMappingResponse(JSON.parse(content), candidates);
}

export const eventsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.listSunziEvents(ctx.user.id)),

  detail: protectedProcedure.input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const event = await db.getSunziEvent(ctx.user.id, input.id);
      if (!event) notFound();
      return event;
    }),

  create: protectedProcedure.input(eventDraftSchema).mutation(async ({ ctx, input }) => ({
    id: await db.createSunziEvent(ctx.user.id, input),
  })),

  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), event: eventDraftSchema }))
    .mutation(async ({ ctx, input }) => {
      const version = await db.updateSunziEvent(ctx.user.id, input.id, input.event);
      if (!version) notFound();
      return { version };
    }),

  analyze: protectedProcedure.input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!allowAnalysis(ctx.user.id)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "分析過於頻繁，請一分鐘後再試。" });
      }
      const event = await db.getSunziEvent(ctx.user.id, input.id);
      if (!event) notFound();
      const version = event.versions[0];
      if (!version) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "事件缺少可分析版本。" });
      const mapping = await generateMapping({
        title: event.title,
        stage: event.stage,
        sensitivity: event.sensitivity,
        facts: version.facts,
        goal: version.goal,
        stakeholders: version.stakeholders,
        resources: version.resources,
        constraints: version.constraints,
        knownRisks: version.knownRisks,
      });
      const analysisId = await db.saveSunziAnalysis(
        ctx.user.id,
        event.id,
        version.id,
        {
          situationSummary: mapping.situationSummary,
          objective: mapping.objective,
          unknownsJson: JSON.stringify(mapping.unknowns),
          interestsJson: JSON.stringify(mapping.interests),
          risksJson: JSON.stringify(mapping.risks),
          caution: mapping.caution,
          model: MODEL,
          promptVersion: PROMPT_VERSION,
          sourceOldid: SUNZI_SOURCE.oldid,
          createdAt: Date.now(),
        },
        mapping.matches,
      );
      if (!analysisId) notFound();
      return { analysisId };
    }),

  addOutcome: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    actionTaken: z.string().trim().min(2).max(3000),
    outcome: z.string().trim().min(2).max(3000),
    reflection: z.string().trim().min(2).max(3000),
  })).mutation(async ({ ctx, input }) => {
    const outcomeId = await db.addSunziOutcome(ctx.user.id, input.id, {
      actionTaken: input.actionTaken,
      outcome: input.outcome,
      reflection: input.reflection,
    });
    if (!outcomeId) notFound();
    return { outcomeId };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!await db.deleteSunziEvent(ctx.user.id, input.id)) notFound();
      return { success: true } as const;
    }),
});
