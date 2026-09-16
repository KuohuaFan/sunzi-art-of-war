import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const sunziEvents = mysqlTable(
  "sunzi_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    stage: mysqlEnum("stage", ["proposed", "active", "pending", "completed"])
      .default("proposed")
      .notNull(),
    sensitivity: mysqlEnum("sensitivity", ["normal", "confidential", "highly_confidential"])
      .default("confidential")
      .notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("sunzi_events_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const sunziEventVersions = mysqlTable(
  "sunzi_event_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    version: int("version").notNull(),
    facts: text("facts").notNull(),
    goal: text("goal").notNull(),
    stakeholders: text("stakeholders").notNull(),
    resources: text("resources").notNull(),
    constraints: text("constraints").notNull(),
    knownRisks: text("knownRisks").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("sunzi_event_versions_event_version_idx").on(table.eventId, table.version),
    index("sunzi_event_versions_event_idx").on(table.eventId),
  ],
);

export const sunziEventAnalyses = mysqlTable(
  "sunzi_event_analyses",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    eventVersionId: int("eventVersionId").notNull(),
    situationSummary: text("situationSummary").notNull(),
    objective: text("objective").notNull(),
    unknownsJson: text("unknownsJson").notNull(),
    interestsJson: text("interestsJson").notNull(),
    risksJson: text("risksJson").notNull(),
    caution: text("caution").notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    promptVersion: varchar("promptVersion", { length: 32 }).notNull(),
    sourceOldid: varchar("sourceOldid", { length: 32 }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [
    index("sunzi_event_analyses_event_idx").on(table.eventId, table.createdAt),
    index("sunzi_event_analyses_version_idx").on(table.eventVersionId),
  ],
);

export const sunziEventMatches = mysqlTable(
  "sunzi_event_matches",
  {
    id: int("id").autoincrement().primaryKey(),
    analysisId: int("analysisId").notNull(),
    rank: int("rank").notNull(),
    chapterNumber: int("chapterNumber").notNull(),
    segmentId: varchar("segmentId", { length: 8 }).notNull(),
    principle: varchar("principle", { length: 120 }).notNull(),
    quote: text("quote").notNull(),
    reason: text("reason").notNull(),
    application: text("application").notNull(),
    limits: text("limits").notNull(),
    confidence: mysqlEnum("confidence", ["high", "medium", "low"]).notNull(),
    missingInfo: text("missingInfo").notNull(),
  },
  table => [
    uniqueIndex("sunzi_event_matches_analysis_rank_idx").on(table.analysisId, table.rank),
    index("sunzi_event_matches_segment_idx").on(table.segmentId),
  ],
);

export const sunziEventOutcomes = mysqlTable(
  "sunzi_event_outcomes",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull(),
    actionTaken: text("actionTaken").notNull(),
    outcome: text("outcome").notNull(),
    reflection: text("reflection").notNull(),
    recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
  },
  table => [index("sunzi_event_outcomes_event_idx").on(table.eventId, table.recordedAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SunziEvent = typeof sunziEvents.$inferSelect;
export type InsertSunziEvent = typeof sunziEvents.$inferInsert;
export type SunziEventVersion = typeof sunziEventVersions.$inferSelect;
export type InsertSunziEventVersion = typeof sunziEventVersions.$inferInsert;
export type SunziEventAnalysis = typeof sunziEventAnalyses.$inferSelect;
export type InsertSunziEventAnalysis = typeof sunziEventAnalyses.$inferInsert;
export type SunziEventMatch = typeof sunziEventMatches.$inferSelect;
export type InsertSunziEventMatch = typeof sunziEventMatches.$inferInsert;
export type SunziEventOutcome = typeof sunziEventOutcomes.$inferSelect;
export type InsertSunziEventOutcome = typeof sunziEventOutcomes.$inferInsert;
