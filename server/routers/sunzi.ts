import { z } from "zod";
import { SUNZI_CHAPTERS, SUNZI_SOURCE } from "../../shared/sunzi-data";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";

const requestWindows = new Map<string, { count: number; resetAt: number }>();

function requestClientId(headers: Record<string, unknown>, ip: string | undefined) {
  const forwarded = headers["x-forwarded-for"];
  return (Array.isArray(forwarded) ? forwarded[0] : typeof forwarded === "string" ? forwarded.split(",")[0] : undefined)?.trim() || ip || "anonymous";
}

function allowRequest(clientId: string, operation: string, limit: number) {
  const now = Date.now();
  const key = `${operation}:${clientId}`;
  const current = requestWindows.get(key);
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

const historySchema = z.array(z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
})).max(6).default([]);

const translationLanguages = {
  en: { label: "English", instruction: "natural, accurate English" },
  ja: { label: "日本語", instruction: "自然で正確な現代日本語" },
  ko: { label: "한국어", instruction: "자연스럽고 정확한 현대 한국어" },
  es: { label: "Español", instruction: "español natural y preciso" },
  fr: { label: "Français", instruction: "français naturel et précis" },
  de: { label: "Deutsch", instruction: "natürliches und präzises Deutsch" },
} as const;

export type TranslationLanguage = keyof typeof translationLanguages;

const translationResponseSchema = z.object({
  chapterTitle: z.string().min(1).max(120),
  summary: z.string().min(1).max(2400),
  segments: z.array(z.object({
    id: z.string().regex(/^\d{2}-\d{2}$/),
    text: z.string().min(1).max(2400),
  })).min(1).max(12),
});

const searchResponseSchema = z.object({
  interpretation: z.string().min(1).max(500),
  matches: z.array(z.object({
    candidateKey: z.string().min(1).max(180),
    reason: z.string().min(1).max(500),
  })).min(1).max(8),
});

function termsOf(query: string) {
  const clean = query.replace(/[\s，。！？、；：「」『』（）]/g, "");
  const terms = new Set<string>();
  if (clean.length >= 2) {
    for (let size = Math.min(4, clean.length); size >= 2; size -= 1) {
      for (let i = 0; i <= clean.length - size; i += 1) terms.add(clean.slice(i, i + size));
    }
  }
  return Array.from(terms);
}

export function buildSunziContext(question: string, currentChapter: number) {
  const terms = termsOf(question);
  const ranked = SUNZI_CHAPTERS.flatMap((chapter) =>
    chapter.segments.map((segment) => {
      let score = chapter.number === currentChapter ? 4 : 0;
      if (question.includes(chapter.title)) score += 20;
      for (const tag of chapter.tags) if (question.includes(tag)) score += 8;
      for (const term of terms) if (segment.text.includes(term)) score += Math.min(6, term.length * 2);
      return { chapter, segment, score };
    }),
  ).sort((a, b) => b.score - a.score || a.chapter.number - b.chapter.number);

  const selected = ranked.filter((item, index) => item.score > 0 || index < 5).slice(0, 10);
  const chapterSummaries = SUNZI_CHAPTERS.map(
    (chapter) => `第${chapter.number}篇〈${chapter.title}〉：${chapter.summary}`,
  ).join("\n");
  const excerpts = selected.map(
    ({ chapter, segment }) => `【${segment.id}｜〈${chapter.title}〉】${segment.text}`,
  ).join("\n\n");

  return `【十三篇篇旨索引】\n${chapterSummaries}\n\n【相關原文段落】\n${excerpts}`;
}

export function buildSearchCatalog() {
  let candidateIndex = 0;
  return SUNZI_CHAPTERS.flatMap(chapter => chapter.points.map(point => {
    const segment = chapter.segments.find(item => item.id === point.segmentId);
    if (!segment) throw new Error(`要義 ${point.title} 缺少有效段號`);
    candidateIndex += 1;
    return {
      aiKey: `C${String(candidateIndex).padStart(3, "0")}`,
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

function searchJsonSchema() {
  return {
    type: "object",
    properties: {
      interpretation: { type: "string", description: "以繁體中文簡述如何理解使用者的情境或概念" },
      matches: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            candidateKey: { type: "string", description: "只能逐字選用候選目錄內的完整 KEY" },
            reason: { type: "string", description: "以繁體中文說明此段與查詢的關聯，不得宣稱成功率" },
          },
          required: ["candidateKey", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["interpretation", "matches"],
    additionalProperties: false,
  };
}

function translationJsonSchema() {
  return {
    type: "object",
    properties: {
      chapterTitle: { type: "string" },
      summary: { type: "string" },
      segments: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, text: { type: "string" } },
          required: ["id", "text"],
          additionalProperties: false,
        },
      },
    },
    required: ["chapterTitle", "summary", "segments"],
    additionalProperties: false,
  };
}

export const sunziRouter = router({
  metadata: publicProcedure.query(() => ({
    chapters: SUNZI_CHAPTERS.length,
    segments: SUNZI_CHAPTERS.reduce((total, chapter) => total + chapter.segments.length, 0),
    characters: SUNZI_CHAPTERS.reduce((total, chapter) => total + chapter.charCount, 0),
    source: SUNZI_SOURCE,
    translationLanguages: Object.entries(translationLanguages).map(([code, item]) => ({ code, label: item.label })),
  })),

  translateChapter: publicProcedure.input(z.object({
    chapterNumber: z.number().int().min(1).max(13),
    language: z.enum(["en", "ja", "ko", "es", "fr", "de"]),
  })).mutation(async ({ input, ctx }) => {
    const clientId = requestClientId(ctx.req.headers, ctx.req.ip);
    if (!allowRequest(clientId, "translate", 5)) throw new Error("翻譯請求過於頻繁，請一分鐘後再試。");
    const chapter = SUNZI_CHAPTERS[input.chapterNumber - 1];
    const language = translationLanguages[input.language];
    const sourceSegments = chapter.segments.map(segment => `${segment.id}\t${segment.text}`).join("\n");
    const response = await invokeLLM({
      model: "gpt-5-mini",
      response_format: {
        type: "json_schema",
        json_schema: { name: "sunzi_chapter_translation", strict: true, schema: translationJsonSchema() },
      },
      messages: [
        {
          role: "system",
          content: `You are a precise translator of classical Chinese. Translate into ${language.instruction}. Preserve every segment ID and return exactly one translated item for each source segment. Translate meaning rather than imitating archaic syntax. Do not add tactics, commentary or facts. The summary is modern editorial commentary, not Sun Tzu's original words; label nothing as a quotation unless it is a source segment. Output JSON only.`,
        },
        {
          role: "user",
          content: `Chapter title: ${chapter.fullTitle}\nEditorial summary: ${chapter.summary}\nSource segments:\n${sourceSegments}`,
        },
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") throw new Error("模型未回傳翻譯內容");
    const parsed = translationResponseSchema.parse(JSON.parse(content));
    const expected = new Set(chapter.segments.map(segment => segment.id));
    if (parsed.segments.length !== chapter.segments.length || parsed.segments.some(segment => !expected.has(segment.id)) || new Set(parsed.segments.map(segment => segment.id)).size !== expected.size) {
      throw new Error("翻譯段號與固定底本不一致，請重試。");
    }
    return { ...parsed, language: input.language, languageLabel: language.label, model: "gpt-5-mini", sourceOldid: SUNZI_SOURCE.oldid };
  }),

  semanticSearch: publicProcedure.input(z.object({
    query: z.string().trim().min(4, "請輸入至少四個字的情境或概念").max(500),
  })).mutation(async ({ input, ctx }) => {
    const clientId = requestClientId(ctx.req.headers, ctx.req.ip);
    if (!allowRequest(clientId, "semantic-search", 8)) throw new Error("情境搜尋過於頻繁，請一分鐘後再試。");
    const catalog = buildSearchCatalog();
    const catalogText = catalog.map(item => `KEY=${item.aiKey}\n〈${item.chapterTitle}〉${item.segmentId}｜${item.principle}\n要義：${item.body}`).join("\n\n");
    const response = await invokeLLM({
      model: "gpt-5-mini",
      response_format: {
        type: "json_schema",
        json_schema: { name: "sunzi_semantic_search", strict: true, schema: searchJsonSchema() },
      },
      messages: [
        {
          role: "system",
          content: "你是《孫子兵法》十三篇的語義檢索器。只能從候選目錄選段號；不得混入《三十六計》或未提供資料。查詢若涉及傷害、欺詐或規避法律，只能回傳可用於降級、風險管理、合法替代及專業覆核的原則。請以繁體中文輸出 JSON。",
        },
        { role: "user", content: `【查詢】${input.query}\n\n【六十四則候選目錄】\n${catalogText}` },
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") throw new Error("模型未回傳搜尋結果");
    const parsed = searchResponseSchema.parse(JSON.parse(content));
    const byKey = new Map(catalog.map(item => [item.aiKey, item]));
    const seen = new Set<string>();
    const matches = parsed.matches.map(match => {
      const item = byKey.get(match.candidateKey);
      if (!item || seen.has(match.candidateKey)) throw new Error("搜尋結果候選無效或重複");
      seen.add(match.candidateKey);
      return { ...item, reason: match.reason };
    });
    return { interpretation: parsed.interpretation, matches, model: "gpt-5-mini", sourceOldid: SUNZI_SOURCE.oldid };
  }),

  ask: publicProcedure.input(z.object({
    question: z.string().trim().min(2).max(500),
    currentChapter: z.number().int().min(1).max(13),
    history: historySchema,
  })).mutation(async ({ input, ctx }) => {
    const clientId = requestClientId(ctx.req.headers, ctx.req.ip);
    if (!allowRequest(clientId, "ask", 8)) throw new Error("提問過於頻繁，請一分鐘後再試。");
    const chapter = SUNZI_CHAPTERS[input.currentChapter - 1];
    const context = buildSunziContext(input.question, input.currentChapter);
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `你是《孫子兵法》十三篇的嚴謹閱讀助手。請一律使用繁體中文，以平實、精確的完整段落作答。

規則：
一、引述原文時，只能逐字引用所提供的【相關原文段落】，並在引文後標示篇名與段號，例如「（〈始計〉01-02）」。
二、找不到足以支持的原文時，明說「現有段落不足以確引」，不可憑印象補字。
三、區分孫子原文、本站篇旨與你的分析；不得把現代商業詮釋偽裝成原典語義。
四、回答以四百字為度；必要時可用短標題，但避免冗長條列。
五、可以討論歷史、組織、決策、談判與風險管理；不得把古典兵法轉化為傷害他人的具體操作指令。
六、讀者目前在第${chapter.number}篇〈${chapter.title}〉。
七、資料來源為維基文庫固定修訂版 oldid 7906064，正文只收十三篇；〈答話〉未混入正文。`,
        },
        ...input.history,
        { role: "user", content: `${context}\n\n【讀者問題】\n${input.question}` },
      ],
    });

    const answer = response.choices[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("模型未回傳可讀內容");
    return { answer: answer.trim(), model: "gpt-5-mini" };
  }),
});
