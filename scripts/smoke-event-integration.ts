import { writeFileSync } from "node:fs";
import { SUNZI_SOURCE } from "../shared/sunzi-data";
import {
  addSunziOutcome,
  createSunziEvent,
  deleteSunziEvent,
  getSunziEvent,
  getUserByOpenId,
  saveSunziAnalysis,
  updateSunziEvent,
  type EventDraft,
} from "../server/db";
import { generateMapping } from "../server/routers/events";

const openId = process.env.OWNER_OPEN_ID;
if (!openId) throw new Error("OWNER_OPEN_ID is unavailable");
const user = await getUserByOpenId(openId);
if (!user) throw new Error("Preview owner user was not created");

const draft: EventDraft = {
  title: `整合測試事件 ${Date.now()}`,
  stage: "proposed",
  sensitivity: "confidential",
  facts: "團隊正在評估一項新服務，目前僅完成三次訪談，尚未完成市場規模驗證。現有開發團隊另有既定交付，人力有限。",
  goal: "在六週內判斷是否進入小規模試行，且不影響既有客戶交付。",
  stakeholders: "本方產品與開發團隊、既有客戶及潛在合作夥伴。",
  resources: "六週、三名兼任成員及有限試行預算。",
  constraints: "不得影響既有客戶交付；對外測試須取得同意並遵守契約。",
  knownRisks: "過早投入會排擠既有專案；延遲可能錯失市場時機。",
};

let eventId: number | undefined;
let failure: unknown;
let result: Record<string, unknown> | undefined;
try {
  eventId = await createSunziEvent(user.id, draft);
  if (await getSunziEvent(user.id + 999_999, eventId) !== null) throw new Error("所有權隔離失敗");

  const versionNumber = await updateSunziEvent(user.id, eventId, {
    ...draft,
    facts: `${draft.facts} 已確認可安排兩個不影響正式環境的原型時段。`,
  });
  if (versionNumber !== 2) throw new Error("版本遞增失敗");

  const event = await getSunziEvent(user.id, eventId);
  if (!event || event.versions.length !== 2) throw new Error("版本保存失敗");
  const latest = event.versions[0];
  const mapping = await generateMapping({
    ...draft,
    facts: latest.facts,
  });
  const analysisId = await saveSunziAnalysis(
    user.id,
    eventId,
    latest.id,
    {
      situationSummary: mapping.situationSummary,
      objective: mapping.objective,
      unknownsJson: JSON.stringify(mapping.unknowns),
      interestsJson: JSON.stringify(mapping.interests),
      risksJson: JSON.stringify(mapping.risks),
      caution: mapping.caution,
      model: "gpt-5",
      promptVersion: "match-map-v1",
      sourceOldid: SUNZI_SOURCE.oldid,
      createdAt: Date.now(),
    },
    mapping.matches,
  );
  if (!analysisId) throw new Error("分析保存失敗");

  const outcomeId = await addSunziOutcome(user.id, eventId, {
    actionTaken: "先安排兩個可逆原型測試。",
    outcome: "取得新的需求資料，未影響既有交付。",
    reflection: "下次先定義停止條件再開始測試。",
  });
  if (!outcomeId) throw new Error("復盤保存失敗");

  const complete = await getSunziEvent(user.id, eventId);
  if (!complete || complete.analyses.length !== 1 || complete.outcomes.length !== 1) throw new Error("完整事件讀取失敗");
  if (complete.analyses[0].matches.length < 3 || complete.analyses[0].matches.length > 5) throw new Error("匹配數量失敗");

  result = {
    ownershipIsolation: true,
    versions: complete.versions.length,
    analyses: complete.analyses.length,
    matches: complete.analyses[0].matches.length,
    outcomes: complete.outcomes.length,
    sourceOldid: complete.analyses[0].sourceOldid,
  };
} catch (error) {
  failure = error;
} finally {
  try {
    if (eventId) {
      const deleted = await deleteSunziEvent(user.id, eventId);
      if (!deleted || await getSunziEvent(user.id, eventId) !== null) throw new Error("測試資料清理失敗");
    }
  } catch (cleanupError) {
    failure ??= cleanupError;
  }
}

if (failure) {
  console.error(failure);
  process.exit(1);
}
writeFileSync("/tmp/sunzi_event_integration_result.json", JSON.stringify(result, null, 2));
process.exit(0);
