import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
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

  linkedin_url: text("linkedin_url"),
  job_board_url: text("job_board_url"),

  score: real("score").notNull().default(0.5), // 0..1
  score_reasons: text("score_reasons"), // JSON array

  // Ashby crawler enrichment (written by ashby-crawler worker, matched by key=slug)
  ashby_industry_tags: text("ashby_industry_tags"), // JSON array
  ashby_tech_signals: text("ashby_tech_signals"),   // JSON array
  ashby_size_signal: text("ashby_size_signal"),     // "startup" | "mid" | "large"
  ashby_enriched_at: text("ashby_enriched_at"),

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

  // Role classification
  role_ai_engineer: integer("role_ai_engineer", { mode: "boolean" }),
  role_confidence: text("role_confidence", { enum: ["high", "medium", "low"] }),
  role_reason: text("role_reason"),
  role_source: text("role_source"),

  // Enhanced ATS data (JSON fields)
  ats_data: text("ats_data"), // Full JSON response from ATS API

  // Greenhouse ATS-specific fields
  absolute_url: text("absolute_url"),
  internal_job_id: integer("internal_job_id"),
  requisition_id: text("requisition_id"),
  company_name: text("company_name"),
  first_published: text("first_published"),
  language: text("language"),
  metadata: text("metadata"), // JSON array
  departments: text("departments"), // JSON array
  offices: text("offices"), // JSON array
  questions: text("questions"), // JSON array
  location_questions: text("location_questions"), // JSON array
  compliance: text("compliance"), // JSON array
  demographic_questions: text("demographic_questions"), // JSON object
  data_compliance: text("data_compliance"), // JSON array

  // Ashby ATS-specific fields
  ashby_department: text("ashby_department"),
  ashby_team: text("ashby_team"),
  ashby_employment_type: text("ashby_employment_type"),
  ashby_is_remote: integer("ashby_is_remote", { mode: "boolean" }),
  ashby_is_listed: integer("ashby_is_listed", { mode: "boolean" }),
  ashby_published_at: text("ashby_published_at"),
  ashby_job_url: text("ashby_job_url"),
  ashby_apply_url: text("ashby_apply_url"),
  ashby_secondary_locations: text("ashby_secondary_locations"), // JSON array
  ashby_compensation: text("ashby_compensation"), // JSON object
  ashby_address: text("ashby_address"), // JSON object

  // Classification-critical ATS columns (restored — dropped by 0004_nifty_northstar.sql)
  country: text("country"),
  workplace_type: text("workplace_type"),
  categories: text("categories"),       // JSON object (Lever categories / Ashby aggregated)
  ats_created_at: text("ats_created_at"),

  // Report pipeline columns (written by job-reporter-llm worker)
  report_reason: text("report_reason"),
  report_confidence: real("report_confidence"),
  report_reasoning: text("report_reasoning"),
  report_tags: text("report_tags"), // JSON array
  report_action: text("report_action"), // pending|auto_restored|escalated|confirmed
  report_trace_id: text("report_trace_id"), // Langfuse trace ID for score updates
  report_reviewed_at: text("report_reviewed_at"),

  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  sourceCompanyExternalIdx: uniqueIndex("idx_jobs_source_company_external").on(table.source_kind, table.company_key, table.external_id),
  postedAtIdx: index("idx_jobs_posted_at_created_at").on(table.posted_at, table.created_at),
  isRemoteEuIdx: index("idx_jobs_is_remote_eu").on(table.is_remote_eu),
  companyKeyIdx: index("idx_jobs_company_key").on(table.company_key),
  sourceKindIdx: index("idx_jobs_source_kind").on(table.source_kind),
  remoteEuPostedIdx: index("idx_jobs_remote_eu_posted").on(table.is_remote_eu, table.posted_at, table.created_at),
}));

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
  user_email: text("user_email").notNull(), // User's email address
  job_id: text("job_id"), // Job URL
  resume_url: text("resume_url"), // Store uploaded resume URL
  questions: text("questions"), // JSON array of {questionId, questionText, answerText}
  status: text("status", {
    enum: ["pending", "submitted", "reviewed", "rejected", "accepted"],
  })
    .notNull()
    .default("pending"),
  notes: text("notes"), // Free-text notes on this application
  job_title: text("job_title"), // Denormalized job title for display
  company_name: text("company_name"), // Denormalized company name for display
  job_description: text("job_description"), // User-supplied job description override
  ai_interview_prep: text("ai_interview_prep"), // JSON: AIInterviewPrep shape
  ai_interview_questions: text("ai_interview_questions"), // JSON: AIInterviewQuestions shape
  ai_agentic_coding: text("ai_agentic_coding"), // JSON: AgenticCoding shape
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

// Application-Track linking (many-to-many)
export const applicationTracks = sqliteTable(
  "application_tracks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    application_id: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    track_slug: text("track_slug").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    uniqueAppTrack: uniqueIndex("idx_application_tracks_unique").on(
      table.application_id,
      table.track_slug,
    ),
  }),
);

export type ApplicationTrack = typeof applicationTracks.$inferSelect;
export type NewApplicationTrack = typeof applicationTracks.$inferInsert;

// Job report audit log (written by job-reporter-llm worker)
export const jobReportEvents = sqliteTable(
  "job_report_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    job_id: integer("job_id")
      .notNull()
      .references(() => jobs.id),
    event_type: text("event_type").notNull(), // reported|llm_analyzed|auto_restored|escalated|confirmed|restored
    actor: text("actor"), // "system:llm" | "admin:<userId>"
    payload: text("payload"), // JSON
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    jobIdx: index("idx_report_events_job").on(table.job_id),
  }),
);

export type JobReportEvent = typeof jobReportEvents.$inferSelect;
export type NewJobReportEvent = typeof jobReportEvents.$inferInsert;

// Deep Planner Tasks
export const deepPlannerTasks = sqliteTable("deep_planner_tasks", {
  id: text("id").primaryKey(), // ULID
  workflow_type: text("workflow_type").notNull(),
  problem_description: text("problem_description").notNull(),
  context: text("context"),
  status: text("status").notNull().default("pending"),
  current_step: text("current_step"),
  checkpoint_count: integer("checkpoint_count").notNull().default(0),
  output_artifact: text("output_artifact"),
  error_message: text("error_message"),
  started_at: text("started_at"),
  completed_at: text("completed_at"),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type DeepPlannerTask = typeof deepPlannerTasks.$inferSelect;
export type NewDeepPlannerTask = typeof deepPlannerTasks.$inferInsert;

// Contacts (from CRM — recruiters and company contacts)
export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    first_name: text("first_name").notNull(),
    last_name: text("last_name").notNull(),
    linkedin_url: text("linkedin_url"),
    email: text("email"),
    emails: text("emails"), // JSON array
    company: text("company"),
    company_id: integer("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    position: text("position"),
    user_id: text("user_id"),
    nb_status: text("nb_status"),
    nb_result: text("nb_result"),
    nb_flags: text("nb_flags"), // JSON array
    nb_suggested_correction: text("nb_suggested_correction"),
    nb_retry_token: text("nb_retry_token"),
    nb_execution_time_ms: integer("nb_execution_time_ms"),
    email_verified: integer("email_verified", { mode: "boolean" }).default(false),
    bounced_emails: text("bounced_emails"), // JSON array of known-bad email addresses
    github_handle: text("github_handle"),
    telegram_handle: text("telegram_handle"),
    do_not_contact: integer("do_not_contact", { mode: "boolean" }).default(false),
    tags: text("tags"), // JSON array
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    emailIdx: index("idx_contacts_email").on(table.email),
    companyIdIdx: index("idx_contacts_company_id").on(table.company_id),
    linkedinUrlIdx: index("idx_contacts_linkedin_url").on(table.linkedin_url),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// Contact Emails (outbound emails sent to a contact)
export const contactEmails = sqliteTable(
  "contact_emails",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contact_id: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    resend_id: text("resend_id").notNull(),
    from_email: text("from_email").notNull(),
    to_emails: text("to_emails").notNull(), // JSON array
    subject: text("subject").notNull(),
    text_content: text("text_content"),
    status: text("status").notNull().default("sent"),
    sent_at: text("sent_at"),
    recipient_name: text("recipient_name"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    contactIdIdx: index("idx_contact_emails_contact_id").on(table.contact_id),
    resendIdIdx: index("idx_contact_emails_resend_id").on(table.resend_id),
  }),
);

export type ContactEmail = typeof contactEmails.$inferSelect;
export type NewContactEmail = typeof contactEmails.$inferInsert;

// Opportunities — personal job pipeline tracker (sourced from CRM)
export const opportunities = sqliteTable(
  "opportunities",
  {
    id: text("id").primaryKey(), // opp_<timestamp>_<random>
    title: text("title").notNull(),
    url: text("url"),
    source: text("source"),
    status: text("status").notNull().default("open"), // open | applied | rejected | offer | closed
    reward_usd: real("reward_usd"),
    reward_text: text("reward_text"),
    start_date: text("start_date"),
    end_date: text("end_date"),
    deadline: text("deadline"),
    first_seen: text("first_seen"),
    last_seen: text("last_seen"),
    score: integer("score"),
    raw_context: text("raw_context"),
    metadata: text("metadata"), // JSON
    applied: integer("applied", { mode: "boolean" }).notNull().default(false),
    applied_at: text("applied_at"),
    application_status: text("application_status"),
    application_notes: text("application_notes"),
    tags: text("tags"), // JSON array
    company_id: integer("company_id").references(() => companies.id),
    contact_id: integer("contact_id").references(() => contacts.id),
    created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
    updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    idxOppStatus: index("idx_opportunities_status").on(t.status),
    idxOppCompany: index("idx_opportunities_company_id").on(t.company_id),
    idxOppContact: index("idx_opportunities_contact_id").on(t.contact_id),
  }),
);

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;

// Study Topics (curated technical study content)
export const studyTopics = sqliteTable("study_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  body_md: text("body_md"),
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"],
  }).notNull().default("intermediate"),
  tags: text("tags"), // JSON array of strings
  deep_dive_md: text("deep_dive_md"),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  categoryTopicIdx: uniqueIndex("idx_study_topics_category_topic")
    .on(table.category, table.topic),
}));

export type StudyTopic = typeof studyTopics.$inferSelect;
export type NewStudyTopic = typeof studyTopics.$inferInsert;

// Study Concept Explanations (LLM-generated, cached by SHA-256 of selected text)
export const studyConceptExplanations = sqliteTable(
  "study_concept_explanations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    study_topic_id: integer("study_topic_id")
      .notNull()
      .references(() => studyTopics.id, { onDelete: "cascade" }),
    text_hash: text("text_hash").notNull(), // SHA-256 hex of selected_text
    selected_text: text("selected_text").notNull(),
    explanation_md: text("explanation_md").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    topicHashIdx: uniqueIndex("idx_study_concept_explanations_topic_hash")
      .on(table.study_topic_id, table.text_hash),
  }),
);

export type StudyConceptExplanation = typeof studyConceptExplanations.$inferSelect;
export type NewStudyConceptExplanation = typeof studyConceptExplanations.$inferInsert;

// Resumes (skill profile uploads, stored as raw text for D1 fallback)
export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(), // UUID
  user_id: text("user_id").notNull(),
  filename: text("filename"),
  raw_text: text("raw_text"),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
