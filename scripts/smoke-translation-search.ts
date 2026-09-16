import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";

const ctx = {
  user: null,
  req: { headers: {}, ip: "127.0.0.1" },
  res: {},
} as unknown as TrpcContext;

const caller = appRouter.createCaller(ctx);
const translation = await caller.sunzi.translateChapter({ chapterNumber: 1, language: "en" });
if (translation.segments.length !== SUNZI_CHAPTERS[0].segments.length) throw new Error("Translation segment count mismatch");
if (translation.segments.some((segment, index) => segment.id !== SUNZI_CHAPTERS[0].segments[index].id)) throw new Error("Translation segment ID mismatch");

const search = await caller.sunzi.semanticSearch({ query: "團隊資源有限，應如何決定是否同時推進多個專案？" });
if (search.matches.length < 1 || search.matches.length > 8) throw new Error("Unexpected semantic search result count");
if (new Set(search.matches.map(item => item.key)).size !== search.matches.length) throw new Error("Duplicate search candidate key");

console.log(JSON.stringify({
  translation: {
    language: translation.languageLabel,
    chapterTitle: translation.chapterTitle,
    segments: translation.segments.length,
    firstSegmentId: translation.segments[0].id,
  },
  semanticSearch: {
    interpretation: search.interpretation,
    matches: search.matches.map(item => ({ chapter: item.chapterTitle, segmentId: item.segmentId, principle: item.principle })),
  },
}, null, 2));
