# Extended Skills Analysis — Additional Relevant Skills for nomadically.work

This document identifies **additional relevant skills and subagents** from awesome-agent-skills and awesome-claude-code-subagents that are valuable for nomadically.work but weren't included in the primary SKILLS-REMOTE-WORK-EU.md. These are organized by use-case and implementation priority.

---

## 1. Document Processing & Resume Management

### Why Relevant?
- Resume parsing for skill extraction and matching
- Job application document generation
- Contract and offer letter handling

### Official Anthropic Skills
- **pdf**: PDF extraction and form processing — Parse resumes, extract candidate info
- **docx**: Word document creation — Generate offer letters, job match reports
- **xlsx**: Excel spreadsheet handling — Export job data, salary benchmarks for analysis

### Claude Code Subagents
- **pdf-specialist** (if available) — Batch resume processing
- **document-automation** (via docx skill) — Auto-generate job descriptions from ATS data

---

## 2. Testing & Quality Assurance (Enhanced)

### Why Relevant?
- End-to-end job board testing
- Resume matching accuracy validation
- Job classification regression tests

### Official Anthropic Skills
- **webapp-testing**: Playwright-based browser automation — Test job search filters, pagination, sorting

### Claude Code Subagents
- **test-automator** (already mentioned) — Expand with E2E tests for job flow
- **chaos-engineer** (voltagent-qa-sec) — Resilience testing for job ingestion failures, D1 outages
- **error-detective** (voltagent-qa-sec) — Analyze error logs from classification pipeline

---

## 3. Advanced Search & Analytics

### Why Relevant?
- Job market trend analysis
- Competitive job board comparison
- Salary benchmarking

### Official Anthropic Skills
- **hugging-face-evaluation**: Model evaluation framework — Validate classifier accuracy across job categories

### Claude Code Subagents
- **data-scientist** (voltagent-data-ai) — Statistical analysis of remote work trends
- **market-researcher** (voltagent-research) — EU job market competitive analysis
- **trend-analyst** (voltagent-research) — Remote work adoption trends by EU region
- **competitive-analyst** (voltagent-research) — Monitor other EU job boards (FlexJobs, Working Nomads, etc.)

---

## 4. Security & Vulnerability Detection

### Why Relevant?
- Protect user data (resumes, preferences)
- Secure GraphQL API
- GDPR compliance validation

### Official Anthropic Skills
- **semgrep-rule-creator** (Trail of Bits) — Create rules for detecting PII in job descriptions
- **static-analysis** (Trail of Bits) — CodeQL + Semgrep for vulnerability scanning
- **differential-review** (Trail of Bits) — Security-focused code review process
- **property-based-testing** (Trail of Bits) — Test edge cases in SQL queries, LLM outputs

### Claude Code Subagents
- **penetration-tester** (voltagent-qa-sec) — Audit GraphQL API for injection attacks
- **ad-security-reviewer** (voltagent-qa-sec) — Active Directory integration if adding SAML auth

---

## 5. Advanced Deployment & Multi-Cloud

### Why Relevant?
- Failover and redundancy across regions
- Global job board scaling
- Cost optimization

### Official Anthropic Skills
- **wrangler** (Cloudflare) — Already recommended, but expanded for D1, KV, R2 bindings
- **azure-ai-agents** (Microsoft) — Alternative to Anthropic Claude for multi-model fallback
- **cosmos-db** (Microsoft) — If migrating from SQLite for global scale

### Claude Code Subagents
- **cloud-architect** (voltagent-infra) — Multi-cloud design (AWS/Azure/GCP failover)
- **kubernetes-specialist** (voltagent-infra) — If containerizing job processing workers
- **network-engineer** (voltagent-infra) — CDN routing, latency optimization for EU regions
- **terraform-engineer** (voltagent-infra) — Infrastructure-as-code for reproducible deployments

---

## 6. Creative & Media (Job Board Marketing)

### Why Relevant?
- Job board promotional content
- Infographics for remote work trends
- Demo videos for features

### Official Anthropic Skills
- **remotion**: Video generation — Create promotional videos, feature demos
- **algorithmic-art**: Generative art with p5.js — Create data visualizations for job trends
- **canvas-design**: Visual art in PNG/PDF — Job market infographics, salary band visualizations
- **slack-gif-creator**: Animated GIF optimization — Social media job alerts

---

## 7. Authentication & Enterprise Features

### Why Relevant?
- OAuth/SAML for enterprise customers
- LDAP/Active Directory integration
- Better Auth alternative to Clerk

### Official Anthropic Skills
- **better-auth**: Open-source auth alternative — Evaluate for cost savings vs. Clerk

### Claude Code Subagents
- **ad-security-reviewer** (voltagent-qa-sec) — Active Directory security audit
- **legal-advisor** (voltagent-biz) — GDPR data processing agreements (DPA) for enterprise contracts

---

## 8. Analytics & Data Warehousing

### Why Relevant?
- Job market analytics dashboard
- Candidate pipeline analytics
- Salary trend reporting

### Official Anthropic Skills
- **hugging-face-datasets**: Dataset creation with SQL — Build training datasets for classifiers
- **hugging-face-jobs**: Compute job execution — Batch process large job datasets

### Claude Code Subagents
- **postgres-pro** (voltagent-data-ai) — If adding PostgreSQL for analytics alongside D1
- **clickhouse-specialist** (if available) — OLAP analytics for job data
- **business-analyst** (voltagent-biz) — Product metrics, KPI tracking

---

## 9. Model Training & Fine-Tuning (Advanced)

### Why Relevant?
- Fine-tune DeepSeek for EU-specific job classification
- Custom skill extraction models
- Domain-specific embeddings for resume matching

### Official Anthropic Skills
- **hugging-face-model-trainer**: TRL-based training (SFT, DPO, GRPO) — Fine-tune open models
- **hugging-face-cli**: Model and dataset management — Version control for trained models

### Claude Code Subagents
- **machine-learning-engineer** (voltagent-data-ai) — Model training pipeline design
- **mlops-engineer** (voltagent-data-ai) — Model versioning, A/B testing, rollback strategies

---

## 10. Legal & Compliance

### Why Relevant?
- GDPR compliance documentation
- EU employment law (working hours, discrimination protections)
- Data retention policies

### Official Anthropic Skills
- **compliance-frameworks**: (if available) — GDPR, CCPA compliance checklists

### Claude Code Subagents
- **legal-advisor** (voltagent-biz) — EU labor law compliance, visa/sponsorship legal review
- **compliance-auditor** (voltagent-qa-sec) — GDPR data processing, consent management audit

---

## 11. Content & SEO (Marketing)

### Why Relevant?
- Blog/content hub for remote work advice
- Job board SEO optimization
- Salary benchmarking reports

### Official Anthropic Skills
- **wordpress-optimization** (if using WordPress for blog) — CMS and SEO best practices

### Claude Code Subagents
- **content-marketer** (voltagent-biz) — EU remote work guides, salary reports
- **technical-writer** (voltagent-biz) — API documentation, integration guides
- **seo-specialist** (voltagent-domains) — Keyword strategy for "remote jobs in [EU city]"

---

## 12. Distributed Systems & Resilience

### Why Relevant?
- Handle job ingestion from multiple ATS platforms simultaneously
- Resume RAG search at scale
- Fault tolerance for D1 outages

### Claude Code Subagents
- **distributed-systems-engineer** (if available in voltagent-core-dev) — Message queues, eventual consistency
- **sre-engineer** (voltagent-infra) — Incident response, observability, alerting
- **platform-engineer** (voltagent-infra) — Service mesh, canary deployments

---

## 13. Real-Time Features (Optional)

### Why Relevant?
- Real-time job alerts for remote workers
- Live job board updates
- WebSocket support for instant notifications

### Claude Code Subagents
- **websocket-engineer** (voltagent-core-dev) — Real-time job notifications, live search updates

---

## 14. Legacy & System Modernization

### Why Relevant?
- Migrate from Turso/LibSQL to D1
- Upgrade outdated dependencies
- Refactor anti-patterns (N+1 queries, fetch-all-then-filter)

### Claude Code Subagents
- **legacy-modernizer** (voltagent-dev-exp) — Migrate ATS fetchers to new runtime
- **refactoring-specialist** (voltagent-dev-exp) — Fix known performance issues in CLAUDE.md
- **dependency-manager** (voltagent-dev-exp) — Audit and upgrade @ai-sdk/anthropic, @mastra/core versions

---

## 15. Specialized Domains (EU Remote Work Context)

### Potentially Relevant
- **fintech-engineer** (voltagent-domains) — Salary comparison tools, payment/compensation data
- **iot-engineer** (voltagent-domains) — If building location-based job discovery (geofencing)
- **m365-admin** (voltagent-domains) — If adding Microsoft Teams/Outlook integration for job alerts

### Not Recommended
- **game-developer** (voltagent-domains) — Job board, not game
- **embedded-systems** (voltagent-domains) — Not hardware-focused
- **blockchain-developer** (voltagent-domains) — Unless handling crypto jobs specifically

---

## 16. Developer Experience & Tooling

### Why Relevant?
- Internal tools for job classification testing
- CLI for bulk operations
- MCP servers for ATS integrations

### Claude Code Subagents
- **cli-developer** (voltagent-dev-exp) — Build pnpm CLI commands for job operations
- **mcp-developer** (voltagent-dev-exp) — Create MCP servers for Greenhouse, Lever, Ashby APIs
- **documentation-engineer** (voltagent-dev-exp) — Auto-generate API docs, schema documentation
- **dx-optimizer** (voltagent-dev-exp) — Improve developer experience for contributors

---

## 17. Multi-Agent Orchestration

### Why Relevant?
- Coordinate multiple LLM agents (classifier, skill extractor, resume matcher)
- Error handling across async job processing
- Complex workflow management

### Claude Code Subagents
- **multi-agent-coordinator** (voltagent-meta) — Orchestrate job classification, skill extraction, resume matching pipeline
- **workflow-orchestrator** (voltagent-meta) — Manage Inngest/Trigger.dev job queue
- **knowledge-synthesizer** (voltagent-meta) — Aggregate insights from multiple LLM outputs
- **context-manager** (voltagent-meta) — Manage context windows across sub-agents

---

## Implementation Priority Matrix

### 🔴 High Priority (Implement Now)
- **document-processing** (pdf, docx) — Resume parsing critical for MVP
- **testing** (Playwright, error analysis) — Ensure classifier reliability
- **security** (semgrep, penetration testing) — GDPR requirement
- **refactoring** (legacy-modernizer) — Address known performance issues

### 🟡 Medium Priority (Implement in Phase 2-3)
- **multi-cloud** (cloud-architect, terraform) — Scaling beyond Cloudflare
- **analytics** (ClickHouse, business-analyst) — Market insights dashboard
- **content** (wordpress, seo-specialist) — Marketing & SEO
- **compliance** (legal-advisor) — Enterprise contracts

### 🟢 Low Priority (Future/Optional)
- **creative** (remotion, algorithmic-art) — Nice-to-have marketing materials
- **real-time** (websocket-engineer) — If feature demand warrants
- **advanced-ml** (model training) — Only if accuracy plateau requires custom models
- **specialized-domains** (fintech, iot) — Out of scope unless pivoting

---

## References

- **awesome-agent-skills** (380+ skills): https://github.com/VoltAgent/awesome-agent-skills
- **awesome-claude-code-subagents** (127+ subagents): https://github.com/VoltAgent/awesome-claude-code-subagents
- **Primary skills doc**: SKILLS-REMOTE-WORK-EU.md
