import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey(),
  external_id: text("external_id").notNull(),
  source_id: text("source_id"),
  source_kind: text("source_kind").notNull(),
  company_key: text("company_key").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  url: text("url").notNull(),
  description: text("description"),
  posted_at: text("posted_at").notNull(),
  score: real("score"),
  score_reason: text("score_reason"),
  status: text("status"),
  is_remote_eu: integer("is_remote_eu", { mode: "boolean" }),
  remote_eu_confidence: text("remote_eu_confidence", {
    enum: ["high", "medium", "low"],
  }),
  remote_eu_reason: text("remote_eu_reason"),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export const ashbyBoards = sqliteTable("ashby_boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  board_name: text("board_name").notNull().unique(),
  discovered_at: text("discovered_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  last_synced_at: text("last_synced_at"),
  job_count: integer("job_count").default(0),
  is_active: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(sql`1`),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type AshbyBoard = typeof ashbyBoards.$inferSelect;
export type NewAshbyBoard = typeof ashbyBoards.$inferInsert;

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull().unique(), // Clerk user ID
  email_notifications: integer("email_notifications", { mode: "boolean" })
    .notNull()
    .default(sql`1`),
  daily_digest: integer("daily_digest", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
  new_job_alerts: integer("new_job_alerts", { mode: "boolean" })
    .notNull()
    .default(sql`1`),
  preferred_locations: text("preferred_locations"), // JSON array
  preferred_skills: text("preferred_skills"), // JSON array
  excluded_companies: text("excluded_companies"), // JSON array
  dark_mode: integer("dark_mode", { mode: "boolean" })
    .notNull()
    .default(sql`1`),
  jobs_per_page: integer("jobs_per_page").notNull().default(20),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export const jobSkillTags = sqliteTable(
  "job_skill_tags",
  {
    job_id: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    level: text("level", {
      enum: ["required", "preferred", "nice"],
    }).notNull(),
    confidence: real("confidence"),
    evidence: text("evidence"),
    extracted_at: text("extracted_at").notNull(),
    version: text("version").notNull(),
  },
  (table) => ({
    pk: { name: "job_skill_tags_pk", columns: [table.job_id, table.tag] },
    tagJobIdx: {
      name: "idx_job_skill_tags_tag_job",
      columns: [table.tag, table.job_id],
    },
    jobIdIdx: { name: "idx_job_skill_tags_job_id", columns: [table.job_id] },
  }),
);

export type JobSkillTag = typeof jobSkillTags.$inferSelect;
export type NewJobSkillTag = typeof jobSkillTags.$inferInsert;

export const skillAliases = sqliteTable("skill_aliases", {
  alias: text("alias").primaryKey(),
  tag: text("tag").notNull(),
});

export type SkillAlias = typeof skillAliases.$inferSelect;
export type NewSkillAlias = typeof skillAliases.$inferInsert;
