# Curated Agent Skills for nomadically.work — Remote Work in EU Focus

This document curates relevant skills and subagents from [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) and [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents), tailored to the nomadically.work project with emphasis on **remote EU job board aggregation and matching**.

---

## 1. Core Frontend & UI/UX

**Purpose:** Build responsive, performant job board interfaces with excellent UX for remote workers across EU markets.

### Official Anthropic Skills
- **Frontend Design and UI/UX Development** — Design-to-code workflows for job listings, filters, and application tracking
- **Web Artifacts Builder with React/Tailwind** — Rapid prototyping of job search, resume, and settings pages
- **Next.js Optimization and Caching Strategies** (Vercel) — Static generation for job listings, ISR for real-time updates

### Claude Code Subagents
- **nextjs-developer** (voltagent-core-dev) — Framework expertise for App Router, API routes, middleware
- **frontend-developer** (voltagent-core-dev) — React 19 component architecture, state management
- **react-specialist** (voltagent-lang) — Advanced patterns for job filtering, search bars, infinite scroll
- **ui-designer** (voltagent-core-dev) — Design system consistency for multi-language job board (EU localization)

---

## 2. Backend, GraphQL & Data Architecture

**Purpose:** Design scalable GraphQL API with D1 database for job aggregation, filtering, and resume matching across EU platforms.

### Official Anthropic Skills
- **MCP Server Creation** — Build Model Context Protocol servers for ATS integrations (Greenhouse, Lever, Ashby)
- **Cloudflare Tools (Workers, D1, Vectorize, Queues)** (Cloudflare Team) — Serverless job processing pipeline, resume RAG indexing, background job classification

### Claude Code Subagents
- **graphql-architect** (voltagent-core-dev) — Schema design for jobs, companies, applications, skills taxonomy
- **backend-developer** (voltagent-core-dev) — Apollo Server 5 resolvers, context with Clerk auth, federation patterns
- **database-administrator** (voltagent-infra) — Drizzle ORM optimization, D1 query performance, migration strategy
- **api-designer** (voltagent-core-dev) — REST endpoint design for text-to-SQL, company enrichment, bulk imports
- **database-optimizer** (voltagent-data-ai) — Index optimization for job search queries, skill extraction performance

---

## 3. AI/LLM & Job Classification Pipeline

**Purpose:** Develop ML pipeline for accurate remote EU job classification, skill extraction, and resume matching.

### Official Anthropic Skills
- **Prompt Engineering** — Optimize prompts for job classification, bias detection, skill extraction accuracy
- **Document Handling (PDF, DOCX)** — Parse resumes and job descriptions for skill matching

### Claude Code Subagents
- **llm-architect** (voltagent-data-ai) — Design multi-LLM pipelines (Claude, DeepSeek, Google) for job classification
- **prompt-engineer** (voltagent-data-ai) — Refine classification and extraction prompts; manage Langfuse prompt versions
- **nlp-engineer** (voltagent-data-ai) — Skill extraction, entity recognition for remote work indicators (flexible hours, timezone-agnostic, etc.)
- **machine-learning-engineer** (voltagent-data-ai) — Train classifiers for EU remote job signals; handle regional variations
- **ai-engineer** (voltagent-data-ai) — End-to-end ML pipeline management, model evaluation with Promptfoo/Vitest

---

## 4. Data Engineering & Ingestion

**Purpose:** Ingest jobs from Greenhouse, Lever, Ashby; extract skills; maintain taxonomy; evaluate model accuracy.

### Claude Code Subagents
- **data-engineer** (voltagent-data-ai) — Build ATS fetcher pipelines (Greenhouse, Lever, Ashby), ETL workflows
- **data-analyst** (voltagent-data-ai) — Job board coverage analysis, skill taxonomy validation, remote work trend reporting
- **data-scientist** (voltagent-data-ai) — Statistical analysis of job classifications, bias audit (fairness across EU regions)

---

## 5. Infrastructure, Deployment & DevOps

**Purpose:** Deploy and maintain the application on Vercel + Cloudflare Workers with resilient data pipelines.

### Official Anthropic Skills
- **Cloudflare Workers Deployment** — D1 Gateway, ashby-crawler (Rust/WASM), process-jobs (Python/LangGraph)
- **Web Performance Auditing** (Cloudflare Team) — Job board page speed, Core Web Vitals monitoring

### Claude Code Subagents
- **devops-engineer** (voltagent-infra) — CI/CD for Next.js + Workers, deployment orchestration
- **deployment-engineer** (voltagent-infra) — Vercel + Cloudflare multi-environment setup, secrets management
- **platform-engineer** (voltagent-infra) — Observability (Langfuse/LangSmith), error tracking, log aggregation
- **docker-expert** (voltagent-infra) — Containerize Python Workers if moving to non-CF platforms
- **sre-engineer** (voltagent-infra) — Incident response, job classification failures, database connectivity issues

---

## 6. Quality Assurance & Testing

**Purpose:** Evaluate job classification accuracy, detect bias, assess resume matching quality.

### Official Anthropic Skills
- **Smart Contract Vulnerability Scanning** (Trail of Bits) — *Adapt security scanning patterns for LLM prompt injection*
- **Property-Based Testing** (Trail of Bits) — Generate test cases for edge cases in skill extraction

### Claude Code Subagents
- **qa-expert** (voltagent-qa-sec) — Test remote work classification accuracy across job descriptions
- **test-automator** (voltagent-qa-sec) — Automated Vitest suites for evals, regression tests for classifiers
- **performance-engineer** (voltagent-qa-sec) — Profile job listing queries, skill extraction latency, resume RAG search speed
- **accessibility-tester** (voltagent-qa-sec) — WCAG compliance for job board (essential for EU accessibility regulations)

---

## 7. Business & Product

**Purpose:** Align product with remote worker needs across EU markets; manage features and strategy.

### Claude Code Subagents
- **product-manager** (voltagent-biz) — Feature prioritization, user feedback integration, remote work market research
- **seo-specialist** (voltagent-domains) — Job board SEO, geo-targeted keywords for EU remote job search
- **content-marketer** (voltagent-biz) — Blog posts, guides for remote EU job seekers, skill trend reports
- **business-analyst** (voltagent-biz) — Market analysis, competitor monitoring (other EU job boards), revenue modeling
- **technical-writer** (voltagent-biz) — Documentation for job ingestion, resume upload, API endpoints

---

## 8. Security & Compliance

**Purpose:** Secure user data (resumes, preferences), ensure GDPR compliance for EU operations.

### Claude Code Subagents
- **security-engineer** (voltagent-infra) — Audit GraphQL queries for injection, Clerk auth hardening, API key rotation
- **security-auditor** (voltagent-qa-sec) — GDPR data retention audits, PII detection in job descriptions and resumes
- **compliance-auditor** (voltagent-qa-sec) — EU employment law compliance (working hours in job postings, anti-discrimination)

---

## 9. Remote Work & EU-Specific Focus

### Key Indicators for Classification:
- **Remote work signals:** "fully remote," "work from anywhere," "hybrid," "flexible location," "async-friendly"
- **EU timezone compliance:** Offices or hours supporting CET/UTC±1 timezones
- **Work-life balance:** References to max working hours (EU Directive 2003/88), flexible schedules
- **Language diversity:** Multi-language job postings (indicator of EU-wide hiring)
- **Visa/sponsorship:** EU visa sponsorship, relocation support (common in EU remote roles)
- **Data residency:** Job data stored within EU (GDPR-friendly)

### Regional Variations:
- **Eastern EU:** Often more remote-friendly (lower cost of living, timezone flexibility)
- **Western EU:** Hybrid patterns more common (London, Berlin, Amsterdam tech hubs)
- **Southern EU:** Growing remote adoption (Portugal, Spain remote visa programs)

---

## 10. Integration Roadmap

### Phase 1: Foundation
- [ ] **frontend-developer** + **nextjs-developer**: Build job listing UI with filters
- [ ] **graphql-architect** + **backend-developer**: Design GraphQL schema, resolvers
- [ ] **database-administrator**: Optimize D1 schema for job queries

### Phase 2: AI Pipeline
- [ ] **prompt-engineer**: Refine job classification prompts for "remote EU" signal detection
- [ ] **nlm-architect**: Set up multi-LLM routing (Claude for classification, DeepSeek for cost, etc.)
- [ ] **data-engineer**: Ingest jobs from ATS platforms using Trigger.dev/Inngest

### Phase 3: ML Evaluation
- [ ] **nlp-engineer**: Extract remote work signals (keywords, timezone mentions, salary bands)
- [ ] **ai-engineer**: Build evaluation suite with Promptfoo/Vitest for classifier accuracy
- [ ] **performance-engineer**: Profile skill extraction, resume RAG latency

### Phase 4: Deployment & Scale
- [ ] **devops-engineer**: CI/CD pipeline for Next.js + Workers
- [ ] **platform-engineer**: Observability, error tracking, alerts for job ingestion failures
- [ ] **sre-engineer**: Incident response playbooks

### Phase 5: Product & Growth
- [ ] **product-manager**: Remote work feature prioritization, user surveys
- [ ] **seo-specialist**: Optimize job board for "remote jobs in [EU city]" search
- [ ] **content-marketer**: Publish remote work trend reports, salary benchmarks

---

## 11. References

- **Awesome Agent Skills:** https://github.com/VoltAgent/awesome-agent-skills
- **Awesome Claude Code Subagents:** https://github.com/VoltAgent/awesome-claude-code-subagents
- **nomadically.work Project:** `/home/user/nomadically.work`
- **CLAUDE.md:** Architecture, tech stack, data flow documentation
