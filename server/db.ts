import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertSunziEventAnalysis,
  InsertSunziEventMatch,
  InsertUser,
  sunziEventAnalyses,
  sunziEventMatches,
  sunziEventOutcomes,
  sunziEventVersions,
  sunziEvents,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("資料庫目前無法使用");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type EventDraft = {
  title: string;
  stage: "proposed" | "active" | "pending" | "completed";
  sensitivity: "normal" | "confidential" | "highly_confidential";
  facts: string;
  goal: string;
  stakeholders: string;
  resources: string;
  constraints: string;
  knownRisks: string;
};

export async function createSunziEvent(userId: number, input: EventDraft) {
  const db = await requireDb();
  const now = Date.now();
  return db.transaction(async tx => {
    const inserted = await tx.insert(sunziEvents).values({
      userId,
      title: input.title,
      stage: input.stage,
      sensitivity: input.sensitivity,
      createdAt: now,
      updatedAt: now,
    }).$returningId();
    const eventId = inserted[0]?.id;
    if (!eventId) throw new Error("無法建立事件");
    await tx.insert(sunziEventVersions).values({
      eventId,
      version: 1,
      facts: input.facts,
      goal: input.goal,
      stakeholders: input.stakeholders,
      resources: input.resources,
      constraints: input.constraints,
      knownRisks: input.knownRisks,
      createdAt: now,
    });
    return eventId;
  });
}

export async function listSunziEvents(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(sunziEvents)
    .where(eq(sunziEvents.userId, userId))
    .orderBy(desc(sunziEvents.updatedAt));

  return Promise.all(rows.map(async event => {
    const [latestVersion] = await db.select().from(sunziEventVersions)
      .where(eq(sunziEventVersions.eventId, event.id))
      .orderBy(desc(sunziEventVersions.version)).limit(1);
    const [latestAnalysis] = await db.select({ id: sunziEventAnalyses.id, createdAt: sunziEventAnalyses.createdAt })
      .from(sunziEventAnalyses).where(eq(sunziEventAnalyses.eventId, event.id))
      .orderBy(desc(sunziEventAnalyses.createdAt)).limit(1);
    return { ...event, latestVersion, latestAnalysis: latestAnalysis ?? null };
  }));
}

export async function getSunziEvent(userId: number, eventId: number) {
  const db = await requireDb();
  const [event] = await db.select().from(sunziEvents)
    .where(and(eq(sunziEvents.id, eventId), eq(sunziEvents.userId, userId))).limit(1);
  if (!event) return null;

  const [versions, analyses, outcomes] = await Promise.all([
    db.select().from(sunziEventVersions)
      .where(eq(sunziEventVersions.eventId, eventId))
      .orderBy(desc(sunziEventVersions.version)),
    db.select().from(sunziEventAnalyses)
      .where(eq(sunziEventAnalyses.eventId, eventId))
      .orderBy(desc(sunziEventAnalyses.createdAt)),
    db.select().from(sunziEventOutcomes)
      .where(eq(sunziEventOutcomes.eventId, eventId))
      .orderBy(desc(sunziEventOutcomes.recordedAt)),
  ]);
  const analysesWithMatches = await Promise.all(analyses.map(async analysis => ({
    ...analysis,
    unknowns: JSON.parse(analysis.unknownsJson) as string[],
    interests: JSON.parse(analysis.interestsJson) as string[],
    risks: JSON.parse(analysis.risksJson) as string[],
    matches: await db.select().from(sunziEventMatches)
      .where(eq(sunziEventMatches.analysisId, analysis.id))
      .orderBy(sunziEventMatches.rank),
  })));
  return { ...event, versions, analyses: analysesWithMatches, outcomes };
}

export async function updateSunziEvent(userId: number, eventId: number, input: EventDraft) {
  const db = await requireDb();
  const now = Date.now();
  return db.transaction(async tx => {
    const [owned] = await tx.select({ id: sunziEvents.id }).from(sunziEvents)
      .where(and(eq(sunziEvents.id, eventId), eq(sunziEvents.userId, userId))).limit(1);
    if (!owned) return null;
    const [latest] = await tx.select({ version: sunziEventVersions.version }).from(sunziEventVersions)
      .where(eq(sunziEventVersions.eventId, eventId))
      .orderBy(desc(sunziEventVersions.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    await tx.update(sunziEvents).set({
      title: input.title,
      stage: input.stage,
      sensitivity: input.sensitivity,
      updatedAt: now,
    }).where(eq(sunziEvents.id, eventId));
    await tx.insert(sunziEventVersions).values({
      eventId,
      version,
      facts: input.facts,
      goal: input.goal,
      stakeholders: input.stakeholders,
      resources: input.resources,
      constraints: input.constraints,
      knownRisks: input.knownRisks,
      createdAt: now,
    });
    return version;
  });
}

export async function saveSunziAnalysis(
  userId: number,
  eventId: number,
  eventVersionId: number,
  analysis: Omit<InsertSunziEventAnalysis, "id" | "eventId" | "eventVersionId">,
  matches: Array<Omit<InsertSunziEventMatch, "id" | "analysisId">>,
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [owned] = await tx.select({ id: sunziEvents.id }).from(sunziEvents)
      .where(and(eq(sunziEvents.id, eventId), eq(sunziEvents.userId, userId))).limit(1);
    if (!owned) return null;
    const [version] = await tx.select({ id: sunziEventVersions.id }).from(sunziEventVersions)
      .where(and(eq(sunziEventVersions.id, eventVersionId), eq(sunziEventVersions.eventId, eventId))).limit(1);
    if (!version) return null;
    const inserted = await tx.insert(sunziEventAnalyses).values({
      ...analysis,
      eventId,
      eventVersionId,
    }).$returningId();
    const analysisId = inserted[0]?.id;
    if (!analysisId) throw new Error("無法儲存分析");
    await tx.insert(sunziEventMatches).values(matches.map(match => ({ ...match, analysisId })));
    await tx.update(sunziEvents).set({ updatedAt: Date.now() }).where(eq(sunziEvents.id, eventId));
    return analysisId;
  });
}

export async function addSunziOutcome(
  userId: number,
  eventId: number,
  input: { actionTaken: string; outcome: string; reflection: string },
) {
  const db = await requireDb();
  const [owned] = await db.select({ id: sunziEvents.id }).from(sunziEvents)
    .where(and(eq(sunziEvents.id, eventId), eq(sunziEvents.userId, userId))).limit(1);
  if (!owned) return null;
  const inserted = await db.insert(sunziEventOutcomes).values({
    eventId,
    ...input,
    recordedAt: Date.now(),
  }).$returningId();
  await db.update(sunziEvents).set({ updatedAt: Date.now() }).where(eq(sunziEvents.id, eventId));
  return inserted[0]?.id ?? null;
}

export async function deleteSunziEvent(userId: number, eventId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [owned] = await tx.select({ id: sunziEvents.id }).from(sunziEvents)
      .where(and(eq(sunziEvents.id, eventId), eq(sunziEvents.userId, userId))).limit(1);
    if (!owned) return false;
    const analyses = await tx.select({ id: sunziEventAnalyses.id }).from(sunziEventAnalyses)
      .where(eq(sunziEventAnalyses.eventId, eventId));
    const analysisIds = analyses.map(item => item.id);
    if (analysisIds.length > 0) {
      await tx.delete(sunziEventMatches).where(inArray(sunziEventMatches.analysisId, analysisIds));
    }
    await tx.delete(sunziEventAnalyses).where(eq(sunziEventAnalyses.eventId, eventId));
    await tx.delete(sunziEventOutcomes).where(eq(sunziEventOutcomes.eventId, eventId));
    await tx.delete(sunziEventVersions).where(eq(sunziEventVersions.eventId, eventId));
    await tx.delete(sunziEvents).where(eq(sunziEvents.id, eventId));
    return true;
  });
}
