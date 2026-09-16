import { generateMapping } from "../server/routers/events";
import { SUNZI_CHAPTERS } from "../shared/sunzi-data";

const mapping = await generateMapping({
  title: "評估是否於第四季推出新服務",
  stage: "proposed",
  sensitivity: "confidential",
  facts: "團隊正在評估一項新服務，目前只有三次客戶訪談，尚未完成市場規模驗證。開發團隊本季另有既定交付，人力有限。競爭者可能在第四季前推出相近功能。",
  goal: "在六週內判斷是否進入小規模試行，並把不可逆投入控制在既定預算內。",
  stakeholders: "本方產品與開發團隊、既有客戶、潛在合作夥伴。",
  resources: "六週驗證期、三名兼任成員、有限試行預算。",
  constraints: "不得影響既有客戶交付；所有對外測試需取得同意並遵守契約。",
  knownRisks: "過早投入可能排擠既有專案；延遲可能錯失市場時機。",
});

if (mapping.matches.length < 3 || mapping.matches.length > 5) throw new Error("匹配數量不符");
for (const match of mapping.matches) {
  const chapter = SUNZI_CHAPTERS[match.chapterNumber - 1];
  const segment = chapter?.segments.find(item => item.id === match.segmentId);
  if (!segment || segment.text !== match.quote) throw new Error(`引文驗證失敗：${match.segmentId}`);
}
console.log(JSON.stringify({
  summary: mapping.situationSummary,
  matches: mapping.matches.map(item => ({
    rank: item.rank,
    chapter: SUNZI_CHAPTERS[item.chapterNumber - 1]?.title,
    segmentId: item.segmentId,
    principle: item.principle,
    confidence: item.confidence,
  })),
}, null, 2));
