# Skills & Subagents Documentation — nomadically.work

This folder contains comprehensive skills analysis and recommendations for nomadically.work, curated from [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) (380+ skills) and [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) (127+ subagents).

---

## 📚 Documentation Structure

### 1. **SKILLS-REMOTE-WORK-EU.md** (Primary Reference)
**Purpose:** Core curated skills aligned with nomadically.work's remote EU focus

**What's Covered:**
- 9 primary skill categories with 40+ relevant skills/subagents
- Official Anthropic skills + Claude Code subagents mapping
- EU-specific remote work classification signals
- 5-phase integration roadmap (Foundation → Growth)

**When to Use:**
- Starting new features aligned with established project scope
- Training new contributors on recommended tech stack
- Planning sprints with skill-focused tasks

**Key Sections:**
1. Core Frontend & UI/UX (Next.js, React)
2. Backend, GraphQL & Data Architecture (Apollo, D1, Drizzle)
3. AI/LLM & Job Classification Pipeline (Claude, DeepSeek, Prompt Engineering)
4. Data Engineering & Ingestion (ATS fetchers, skill extraction)
5. Infrastructure, Deployment & DevOps (Vercel, Cloudflare Workers)
6. Quality Assurance & Testing (Vitest, Promptfoo, accessibility)
7. Business & Product (Product strategy, SEO, content)
8. Security & Compliance (GDPR, OWASP, PII protection)
9. Remote Work & EU-Specific Focus (Timezone compliance, visa signals)

---

### 2. **SKILLS-EXTENDED-ANALYSIS.md** (Detailed Exploration)
**Purpose:** Identify additional valuable skills not in primary list; assess secondary use-cases

**What's Covered:**
- 17 extended skill categories with specific tool recommendations
- Document processing (PDF, DOCX parsing for resumes)
- Enhanced testing & resilience (Playwright, chaos engineering)
- Advanced analytics & data warehousing (ClickHouse, trend analysis)
- Security & vulnerability scanning (semgrep, Trail of Bits)
- Multi-cloud & Kubernetes scaling
- Model training & fine-tuning (Hugging Face)
- Legal & compliance (GDPR, EU employment law)
- Real-time features & WebSockets
- Legacy system modernization
- Implementation priority matrix (High/Medium/Low)

**When to Use:**
- Planning major feature expansions (e.g., adding resume RAG)
- Assessing build vs. buy decisions (e.g., multi-cloud failover)
- Long-term roadmap planning (3-6 months out)
- Identifying skills gaps and learning priorities

**Key Sections:**
1. Document Processing & Resume Management
2. Enhanced Testing & QA
3. Advanced Search & Analytics
4. Security & Vulnerability Detection
5. Multi-Cloud & Distributed Systems
6. Creative & Media (Job Board Marketing)
7. Analytics & Data Warehousing
8. Model Training & Fine-Tuning
9. Legal & Compliance
10. Content & SEO
11. Real-Time Features
12. Legacy Modernization
13. Developer Experience & Tooling
14. Multi-Agent Orchestration

---

### 3. **SKILLS-INVENTORY.md** (Current State Assessment)
**Purpose:** Track what skills are currently implemented vs. recommended; prioritize adoption

**What's Covered:**
- ✅ 15+ currently implemented skills mapped to project locations
- 🟡 8 partially implemented/stub features with completion roadmap
- 🔴 23 high/medium/low priority skills for adoption with effort estimates
- Priority matrix with implementation costs
- 4-phase subagent adoption roadmap
- Skills gap analysis with solutions
- Quick start roadmap (Month 1-3)

**When to Use:**
- Sprint planning (what to pick up next?)
- Onboarding contributors (current architecture overview)
- Assessing project maturity (what's missing?)
- Presenting to stakeholders (roadmap visibility)

**Key Sections:**
1. Currently Implemented (15 skill areas mapped)
2. Partially Implemented / Stubs (8 features)
3. Recommended Adoption (23 skills prioritized)
4. Subagent Adoption Roadmap (4 phases)
5. Skills Gap Analysis
6. Quick Start (Month 1-3 prioritization)

---

## 🎯 How to Use These Documents

### For Sprint Planning
1. **Open SKILLS-INVENTORY.md** → "Recommended Adoption" section
2. Pick skills from **High Priority** list
3. Reference effort estimates for backlog sizing
4. Link to specific subagent in SKILLS-REMOTE-WORK-EU.md or SKILLS-EXTENDED-ANALYSIS.md

### For Feature Development
1. **Open SKILLS-REMOTE-WORK-EU.md** → Find relevant skill category
2. Review "Official Anthropic Skills" and "Claude Code Subagents"
3. Use **integration roadmap** to understand dependencies
4. Check SKILLS-INVENTORY.md for current implementation status

### For Architecture Decisions
1. **Open SKILLS-EXTENDED-ANALYSIS.md** → Find solution (e.g., "Multi-Cloud")
2. Review "Why Relevant?" and implementation options
3. Check SKILLS-INVENTORY.md priority matrix for go/no-go decision
4. Estimate effort, plan as separate epic

### For Onboarding New Contributors
1. Share **SKILLS-INVENTORY.md** "Currently Implemented" section
2. Show codebase locations for each skill
3. Point to relevant SKILLS-REMOTE-WORK-EU.md category
4. Suggest reading SKILLS-EXTENDED-ANALYSIS.md for context

### For Stakeholder Communication
1. Share **SKILLS-INVENTORY.md** "Quick Start: Recommended Next Steps"
2. Show 3-phase roadmap with priorities
3. Reference effort estimates for planning
4. Use priority matrix to justify go/no-go decisions

---

## 🚀 Quick Reference: Top 10 Priority Skills

### Immediate (Start Now)
1. **Multi-Agent Orchestration** → Coordinate classifier → skill extractor → matcher
2. **Document Processing** (pdf, docx) → Resume parsing for skill extraction
3. **Security Scanning** (semgrep) → PII detection, OWASP scanning
4. **Web Testing** (Playwright) → E2E job search & filter tests
5. **Accessibility Testing** → WCAG 2.1 AA compliance for EU market

### Short-term (Next 4-8 weeks)
6. **Error Analysis** → Debug classification pipeline failures
7. **Legacy Modernization** → Fix N+1 queries, performance bottlenecks
8. **Analytics Dashboard** (ClickHouse) → Market trends, salary benchmarks
9. **SEO & Content Marketing** → Blog, remote work guides, keyword optimization
10. **Compliance Review** (Legal Advisor) → GDPR DPA, EU employment law

---

## 📊 Coverage Matrix

| Area | Primary Doc | Extended Doc | Inventory |
|---|---|---|---|
| **Current Implementation** | ✅ | Reference | ✅ Focus |
| **What's Recommended** | ✅ Focus | ✅ | ✅ Priority |
| **Implementation Effort** | Implied | Brief | ✅ Detailed |
| **Roadmap Planning** | ✅ 5-phase | 📊 Matrix | ✅ 4-phase+Months |
| **EU Remote Work Focus** | ✅ Emphasis | Scattered | Reference |
| **Gap Analysis** | Implied | Implied | ✅ Focus |
| **Adoption Timeline** | Implied | Brief | ✅ Detailed |

---

## 🔗 Related Documentation

- **CLAUDE.md** — Project architecture, tech stack, known issues, deployment
- **GitHub Repository** — awesome-agent-skills (https://github.com/VoltAgent/awesome-agent-skills)
- **GitHub Repository** — awesome-claude-code-subagents (https://github.com/VoltAgent/awesome-claude-code-subagents)

---

## 📝 Document Maintenance

These documents should be updated when:
- ✏️ New skills are adopted or implemented
- 🔄 Project roadmap changes
- 🐛 Known issues are resolved (from CLAUDE.md)
- 📦 New subagents become available in awesome repos
- 🎯 Project priorities shift

---

## 🎓 Learning Path

**If you're new to nomadically.work:**

1. **Week 1:** Read SKILLS-INVENTORY.md "Currently Implemented" section
2. **Week 2:** Study SKILLS-REMOTE-WORK-EU.md "AI/LLM Pipeline" section
3. **Week 3:** Review CLAUDE.md "Key known issues" section
4. **Week 4:** Explore SKILLS-EXTENDED-ANALYSIS.md for your specific interest area

**If you're planning a major feature:**

1. **Step 1:** Find relevant category in SKILLS-REMOTE-WORK-EU.md
2. **Step 2:** Review SKILLS-INVENTORY.md adoption roadmap
3. **Step 3:** Check SKILLS-EXTENDED-ANALYSIS.md for adjacent capabilities
4. **Step 4:** Reference effort matrix, create sprint tasks

---

## ❓ FAQ

**Q: Which document should I read first?**
A: Start with SKILLS-INVENTORY.md for current state, then SKILLS-REMOTE-WORK-EU.md for primary recommendations.

**Q: Are all 380+ skills relevant?**
A: No. These docs curate ~80 most relevant to nomadically.work's EU job board focus.

**Q: What if I want to add a skill not in these docs?**
A: Check awesome repos, propose in SKILLS-EXTENDED-ANALYSIS.md, discuss with team for adoption.

**Q: Should I use all recommended skills?**
A: No. Follow SKILLS-INVENTORY.md prioritization (High → Medium → Low).

**Q: How often are these updated?**
A: Quarterly or when major decisions are made. Updates tracked in git history.

---

## 📞 Contact & Questions

For questions about these recommendations:
- Review the specific document section
- Check CLAUDE.md for architecture context
- Ask team lead about prioritization rationale
- Propose updates via git commits

---

Generated: 2025-02-19
Last Updated: 2025-02-19
Status: Active — Part of nomadically.work documentation
