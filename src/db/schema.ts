import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // Unique identifier (slug/domain)
  name: text("name").notNull(),
  logo_url: text("logo_url"),
  website: text("website"),
  description: text("description"),
  industry: text("industry"),
  size: text("size"), // e.g., "1-10", "11-50", "51-200", etc.
  location: text("location"),

  // Golden record fields
  canonical_domain: text("canonical_domain"),
  category: text("category", {
    enum: [
      "CONSULTANCY",
      "AGENCY",
      "STAFFING",
      "DIRECTORY",
      "PRODUCT",
      "OTHER",
      "UNKNOWN",
    ],
  })
    .notNull()
    .default("UNKNOWN"),
  tags: text("tags"), // JSON array
  services: text("services"), // JSON array of human-readable service phrases
  service_taxonomy: text("service_taxonomy"), // JSON array of normalized taxonomy IDs
  industries: text("industries"), // JSON array for multi-industry

  score: real("score").notNull().default(0.5), // 0..1
  score_reasons: text("score_reasons"), // JSON array

  // Common Crawl / last-seen metadata
  last_seen_crawl_id: text("last_seen_crawl_id"),
  last_seen_capture_timestamp: text("last_seen_capture_timestamp"),
  last_seen_source_url: text("last_seen_source_url"),

  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey(),
  external_id: text("external_id").notNull(),
  source_id: text("source_id"),
  source_kind: text("source_kind").notNull(),
  company_id: integer("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  company_key: text("company_key").notNull(), // Kept for backward compatibility during migration
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
  user_id: text("user_id").notNull().unique(), // Better Auth user ID
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

// Company Facts (MDM/Evidence-based)
export const companyFacts = sqliteTable(
  "company_facts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    field: text("field").notNull(), // e.g., "name", "services", "ats_boards"
    value_json: text("value_json"), // JSON for arrays/objects
    value_text: text("value_text"), // convenience text
    normalized_value: text("normalized_value"), // JSON normalized form
    confidence: real("confidence").notNull(), // 0..1

    // Evidence/Provenance
    source_type: text("source_type", {
      enum: ["COMMONCRAWL", "LIVE_FETCH", "MANUAL", "PARTNER"],
    }).notNull(),
    source_url: text("source_url").notNull(),
    crawl_id: text("crawl_id"),
    capture_timestamp: text("capture_timestamp"), // YYYYMMDDhhmmss
    observed_at: text("observed_at").notNull(),
    method: text("method", {
      enum: ["JSONLD", "META", "DOM", "HEURISTIC", "LLM"],
    }).notNull(),
    extractor_version: text("extractor_version"),
    http_status: integer("http_status"),
    mime: text("mime"),
    content_hash: text("content_hash"),

    // WARC pointer
    warc_filename: text("warc_filename"),
    warc_offset: integer("warc_offset"),
    warc_length: integer("warc_length"),
    warc_digest: text("warc_digest"),

    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    companyFieldIdx: {
      name: "idx_company_facts_company_field",
      columns: [table.company_id, table.field],
    },
  }),
);

export type CompanyFact = typeof companyFacts.$inferSelect;
export type NewCompanyFact = typeof companyFacts.$inferInsert;

// Company Snapshots (Crawl storage for debugging/reprocessing)
export const companySnapshots = sqliteTable(
  "company_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    source_url: text("source_url").notNull(),
    crawl_id: text("crawl_id"),
    capture_timestamp: text("capture_timestamp"),
    fetched_at: text("fetched_at").notNull(),

    http_status: integer("http_status"),
    mime: text("mime"),
    content_hash: text("content_hash"),

    text_sample: text("text_sample"), // First N chars
    jsonld: text("jsonld"), // JSON parsed JSON-LD
    extracted: text("extracted"), // JSON extractor output

    // Evidence
    source_type: text("source_type", {
      enum: ["COMMONCRAWL", "LIVE_FETCH", "MANUAL", "PARTNER"],
    }).notNull(),
    method: text("method", {
      enum: ["JSONLD", "META", "DOM", "HEURISTIC", "LLM"],
    }).notNull(),
    extractor_version: text("extractor_version"),

    // WARC pointer
    warc_filename: text("warc_filename"),
    warc_offset: integer("warc_offset"),
    warc_length: integer("warc_length"),
    warc_digest: text("warc_digest"),

    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    companyHashIdx: {
      name: "idx_company_snapshots_company_hash",
      columns: [table.company_id, table.content_hash],
    },
  }),
);

export type CompanySnapshot = typeof companySnapshots.$inferSelect;
export type NewCompanySnapshot = typeof companySnapshots.$inferInsert;

// ATS Boards
export const atsBoards = sqliteTable(
  "ats_boards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    company_id: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    url: text("url").notNull(),
    vendor: text("vendor", {
      enum: [
        "GREENHOUSE",
        "LEVER",
        "WORKABLE",
        "TEAMTAILOR",
        "ASHBY",
        "SMARTRECRUITERS",
        "JAZZHR",
        "BREEZYHR",
        "ICIMS",
        "JOBVITE",
        "SAP_SUCCESSFACTORS",
        "ORACLE_TALEO",
        "OTHER",
      ],
    }).notNull(),
    board_type: text("board_type", {
      enum: ["JOBS_PAGE", "BOARD_API", "BOARD_WIDGET", "UNKNOWN"],
    }).notNull(),

    confidence: real("confidence").notNull(), // 0..1
    is_active: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),

    first_seen_at: text("first_seen_at").notNull(),
    last_seen_at: text("last_seen_at").notNull(),

    // Evidence
    source_type: text("source_type", {
      enum: ["COMMONCRAWL", "LIVE_FETCH", "MANUAL", "PARTNER"],
    }).notNull(),
    source_url: text("source_url").notNull(),
    crawl_id: text("crawl_id"),
    capture_timestamp: text("capture_timestamp"),
    observed_at: text("observed_at").notNull(),
    method: text("method", {
      enum: ["JSONLD", "META", "DOM", "HEURISTIC", "LLM"],
    }).notNull(),
    extractor_version: text("extractor_version"),

    // WARC pointer
    warc_filename: text("warc_filename"),
    warc_offset: integer("warc_offset"),
    warc_length: integer("warc_length"),
    warc_digest: text("warc_digest"),

    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    companyUrlIdx: {
      name: "idx_ats_boards_company_url",
      columns: [table.company_id, table.url],
    },
    vendorIdx: {
      name: "idx_ats_boards_vendor",
      columns: [table.vendor],
    },
  }),
);

export type ATSBoard = typeof atsBoards.$inferSelect;
export type NewATSBoard = typeof atsBoards.$inferInsert;

// User Preferences (Evidence-based personalization)
export const userPreferences = sqliteTable(
  "user_preferences",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    user_id: text("user_id")
      .notNull()
      .references(() => userSettings.user_id, { onDelete: "cascade" }),

    // Preference field (e.g., "preferred_countries", "excluded_company_types", "min_salary")
    field: text("field").notNull(),

    // Value storage
    value_json: text("value_json"), // JSON for arrays/objects
    value_text: text("value_text"), // Plain text value
    value_number: real("value_number"), // Numeric value

    // Evidence/confidence tracking
    confidence: real("confidence").notNull().default(1.0), // 0..1
    source: text("source", {
      enum: ["EXPLICIT_SETTING", "INFERRED_ACTION", "FEEDBACK", "IMPLICIT"],
    }).notNull(),

    // Context for inference
    context: text("context"), // JSON with additional context
    observed_at: text("observed_at").notNull(),

    // Tracking
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    userFieldIdx: {
      name: "idx_user_preferences_user_field",
      columns: [table.user_id, table.field],
    },
  }),
);

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;

// Applications
export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull(), // Reference to user, but no FK constraint
  email: text("email").notNull(),
  job_id: text("job_id").notNull(), // Job URL
  resume_url: text("resume_url"), // Store uploaded resume URL
  questions: text("questions"), // JSON array of {questionId, questionText, answerText}
  status: text("status", {
    enum: ["pending", "submitted", "reviewed", "rejected", "accepted"],
  })
    .notNull()
    .default("pending"),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
