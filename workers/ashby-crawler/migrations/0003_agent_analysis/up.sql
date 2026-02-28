-- Agent analysis results for job applications
CREATE TABLE IF NOT EXISTS job_agent_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_url TEXT NOT NULL,
    job_title TEXT,
    company_name TEXT,

    -- Tool outputs (JSON columns)
    tech_stack TEXT,           -- analyze_tech_stack output
    remote_eu_score INTEGER,   -- score_remote_eu score (0-100)
    remote_eu_detail TEXT,     -- score_remote_eu full output
    agentic_patterns TEXT,     -- extract_agentic_patterns output
    agentic_score INTEGER,     -- agentic score (0-100)
    skills_match TEXT,         -- match_skills output
    skills_match_score INTEGER,-- fit_score (0-100)
    seniority TEXT,            -- classify_seniority output
    seniority_level TEXT,      -- "entry"|"junior"|"mid"|"senior"|"staff+"
    ats_provider TEXT,         -- detect_ats_provider output
    salary_signals TEXT,       -- extract_salary_signals output
    culture_score INTEGER,     -- score_company_culture score (0-100)
    culture_detail TEXT,       -- score_company_culture full output
    application_brief TEXT,    -- generate_application_brief output
    composite_fit_score INTEGER, -- rank_job_fit score (0-100)
    fit_recommendation TEXT,   -- "strong_apply"|"apply"|"consider"|"low_priority"|"skip"
    fit_detail TEXT,           -- rank_job_fit full output

    analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(job_url)
);

CREATE INDEX IF NOT EXISTS idx_job_agent_analysis_score ON job_agent_analysis(composite_fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_agent_analysis_remote ON job_agent_analysis(remote_eu_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_agent_analysis_recommendation ON job_agent_analysis(fit_recommendation);
