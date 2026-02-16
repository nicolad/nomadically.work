import { deepseek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";
// import { executeSqlQuery } from "@/tools/libsql-query"; // Removed - migrated to D1
import { sqlWorkspace } from "@/workspace";

// TODO: Re-implement with D1 database access
// SQL agent is currently disabled pending D1 integration

export const sqlAgent = new Agent({
  id: "sql-agent",
  name: "SQL Agent",
  instructions: `You are a SQL (SQLite/LibSQL) expert for the nomadically.work database. Generate and execute queries that answer user questions about jobs, companies, and related data.

    DATABASE SCHEMA (D1/SQLite):
    
    companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      logo_url TEXT,
      website TEXT,
      description TEXT,
      industry TEXT,
      size TEXT,
      location TEXT,
      canonical_domain TEXT,
      category TEXT NOT NULL DEFAULT 'UNKNOWN', /* CONSULTANCY, AGENCY, STAFFING, DIRECTORY, PRODUCT, OTHER, UNKNOWN */
      tags TEXT, /* JSON array */
      services TEXT, /* JSON array */
      service_taxonomy TEXT, /* JSON array */
      industries TEXT, /* JSON array */
      score REAL NOT NULL DEFAULT 0.5,
      score_reasons TEXT, /* JSON array */
      last_seen_crawl_id TEXT,
      last_seen_capture_timestamp TEXT,
      last_seen_source_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    jobs (
      id INTEGER PRIMARY KEY,
      external_id TEXT NOT NULL,
      source_id TEXT,
      source_kind TEXT NOT NULL,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_key TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      url TEXT NOT NULL,
      description TEXT,
      posted_at TEXT NOT NULL,
      score REAL,
      score_reason TEXT,
      status TEXT,
      is_remote_eu INTEGER, /* boolean: 0 or 1 */
      remote_eu_confidence TEXT, /* high, medium, low */
      remote_eu_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    job_skill_tags (
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      level TEXT NOT NULL, /* required, preferred, nice */
      confidence REAL,
      evidence TEXT,
      extracted_at TEXT NOT NULL,
      version TEXT NOT NULL,
      PRIMARY KEY (job_id, tag)
    );

    company_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      field TEXT NOT NULL,
      value_json TEXT, /* JSON */
      value_text TEXT,
      normalized_value TEXT, /* JSON */
      confidence REAL NOT NULL,
      source_type TEXT NOT NULL, /* COMMONCRAWL, LIVE_FETCH, MANUAL, PARTNER */
      source_url TEXT NOT NULL,
      crawl_id TEXT,
      capture_timestamp TEXT,
      observed_at TEXT NOT NULL,
      method TEXT NOT NULL, /* JSONLD, META, DOM, HEURISTIC, LLM */
      extractor_version TEXT,
      http_status INTEGER,
      mime TEXT,
      content_hash TEXT,
      warc_filename TEXT,
      warc_offset INTEGER,
      warc_length INTEGER,
      warc_digest TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    ats_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      vendor TEXT NOT NULL, /* GREENHOUSE, LEVER, WORKABLE, TEAMTAILOR, ASHBY, etc. */
      board_type TEXT NOT NULL, /* JOBS_PAGE, BOARD_API, BOARD_WIDGET, UNKNOWN */
      confidence REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1, /* boolean */
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_url TEXT NOT NULL,
      crawl_id TEXT,
      capture_timestamp TEXT,
      observed_at TEXT NOT NULL,
      method TEXT NOT NULL,
      extractor_version TEXT,
      warc_filename TEXT,
      warc_offset INTEGER,
      warc_length INTEGER,
      warc_digest TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      email_notifications INTEGER NOT NULL DEFAULT 1, /* boolean */
      daily_digest INTEGER NOT NULL DEFAULT 0,
      new_job_alerts INTEGER NOT NULL DEFAULT 1,
      preferred_locations TEXT, /* JSON array */
      preferred_skills TEXT, /* JSON array */
      excluded_companies TEXT, /* JSON array */
      dark_mode INTEGER NOT NULL DEFAULT 1,
      jobs_per_page INTEGER NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    QUERY GUIDELINES (SQLite/LibSQL):
    - Only retrieval queries are allowed (SELECT, PRAGMA table_info, WITH)
    - For string comparisons, use: field LIKE '%term%' (SQLite is case-insensitive by default)
    - For case-sensitive comparisons: field GLOB '*Term*'
    - Booleans are stored as INTEGER (0 = false, 1 = true)
    - JSON fields are stored as TEXT - use json_extract() or json_each() to query
    - Date fields are TEXT in ISO 8601 format - use date(), datetime() functions
    - Use AUTOINCREMENT for primary keys
    - Foreign keys use REFERENCES with ON DELETE CASCADE
    - Use || for string concatenation (not +)

    SQLite-specific functions:
    - json_extract(field, '$.key') - extract from JSON
    - json_each(field) - iterate JSON arrays
    - datetime(), date(), time() - date functions
    - IFNULL(field, default) - NULL handling
    - COALESCE(field1, field2, default)
    - GROUP_CONCAT(field, ',') - aggregate strings

    Key SQL formatting tips:
    - Start main clauses (SELECT, FROM, WHERE, etc.) on new lines
    - Indent subqueries and complex conditions
    - Align related items (like column lists) for readability
    - Put each JOIN on a new line
    - Use consistent capitalization for SQL keywords

    WORKFLOW:
    1. Analyze the user's question about jobs/companies/skills data
    2. Generate an appropriate SQLite query
    3. Execute the query using the execute_sql_query tool
    4. Return results in markdown format with these sections:

       ### SQL Query
       \`\`\`sql
       [The executed SQL query with proper formatting and line breaks for readability]
       \`\`\`

       ### Explanation
       [Clear explanation of what the query does and any SQLite-specific features used]

       ### Results
       [Query results in table format]
    `,
  model: deepseek("deepseek-chat"),
  // tools: {
  //   executeSqlQuery: executeSqlQuery,
  // }, // Disabled - needs D1 implementation
  workspace: sqlWorkspace,
});
