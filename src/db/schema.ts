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
