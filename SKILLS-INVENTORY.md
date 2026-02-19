# Skills Inventory — Current vs. Recommended for nomadically.work

This document maps **which skills/subagents are already being used** vs. **which are recommended for adoption**.

---

## ✅ Currently Implemented

### AI/LLM Integrations
| Skill | Tool/Integration | Status | Location |
|---|---|---|---|
| **LLM Architecture** | Claude API, DeepSeek, Google GenAI, OpenRouter | ✅ Active | `src/anthropic/`, `src/deepseek/`, `src/google/`, `src/openrouter/` |
| **Prompt Engineering** | Langfuse prompt versioning | ✅ Partial | `src/observability/`, `src/agents/index.ts` |
| **NLP/Skill Extraction** | LLM-based pipeline | ✅ Active | `src/lib/skills/`, `src/agents/` |
| **Job Classification** | DeepSeek + Mastra | ✅ Active | `workers/process-jobs/`, `src/agents/index.ts` |
| **Resume RAG** | Vectorize + Workers AI | ✅ Partial | `workers/resume-rag/` |

### Frontend & UI
| Skill | Implementation | Status | Location |
|---|---|---|---|
| **Next.js Development** | Next.js 16 App Router | ✅ Active | `src/app/` |
| **React Components** | React 19 | ✅ Active | `src/components/` |
| **GraphQL Frontend** | Apollo Client | ✅ Active | `src/graphql/`, `src/__generated__/` |

### Backend & API
| Skill | Implementation | Status | Location |
|---|---|---|---|
| **GraphQL Architecture** | Apollo Server 5 | ✅ Active | `src/apollo/`, `schema/` |
| **Database ORM** | Drizzle ORM | ✅ Active | `src/db/schema.ts` |
| **D1 Access** | D1 Gateway Worker | ✅ Active | `workers/d1-gateway.ts` |

### Infrastructure
| Skill | Implementation | Status | Location |
|---|---|---|---|
| **Vercel Deployment** | Next.js on Vercel | ✅ Active | `.vercel/`, `vercel.json` |
| **Cloudflare Workers** | Multiple workers | ✅ Active | `workers/` |
| **Authentication** | Clerk | ✅ Active | `src/apollo/context.ts` |

### Data & Ingestion
| Skill | Implementation | Status | Location |
|---|---|---|---|
| **ATS Ingestion** | Greenhouse, Lever, Ashby APIs | ✅ Active | `src/ingestion/` |
| **Background Jobs** | Trigger.dev, Inngest | ✅ Partial | `src/trigger/`, `src/inngest/` |

### Testing & Evaluation
| Skill | Implementation | Status | Location |
|---|---|---|---|
| **Classifier Evaluation** | Vitest + Mastra Evals | ✅ Partial | `src/evals/`, `src/promptfoo/` |
| **LLM Evaluation** | Promptfoo | ✅ Active | `src/promptfoo/` |
| **Observability** | Langfuse, LangSmith | ✅ Partial | `src/langfuse/`, `src/langsmith/` |

---

## 🟡 Partially Implemented / Stub Status

| Skill | Current State | What's Needed | Priority |
|---|---|---|---|
| **Inngest Integration** | Stubs only | Full workflow definitions, error handling | Medium |
| **Background Jobs** | Trigger.dev focused | Inngest alternatives, queue reliability | Medium |
| **MCP Servers** | Minimal | ATS integration MCPs (Greenhouse, Lever, Ashby) | High |
| **Durable Objects** | Not used | Stateful job queue, coordination | Low |
| **Web Testing** | Not used | Playwright E2E tests for job board flow | Medium |
| **Security Scanning** | Not used | Semgrep rules for PII detection, OWASP scanning | High |
| **Accessibility** | Not tested | WCAG compliance audit for EU regulations | High |

---

## 🔴 Recommended Adoption

### High Priority (Next Sprint)
| Skill | Recommended Tool | Use Case | Estimated Effort |
|---|---|---|---|
| **Document Processing** | pdf + docx skills | Resume parsing, offer generation | 2-3 days |
| **Security Scanning** | semgrep (Trail of Bits) | Detect PII in job descriptions, SQL injection | 1-2 days |
| **Web Testing** | Playwright (@webapp-testing) | E2E job search, filter tests | 2-3 days |
| **Error Analysis** | error-detective subagent | Debug classification failures | 1-2 days |
| **Accessibility** | accessibility-tester subagent | WCAG compliance for EU market | 2-3 days |

### Medium Priority (Phase 2)
| Skill | Recommended Tool | Use Case | Estimated Effort |
|---|---|---|---|
| **Analytics Dashboard** | ClickHouse + data-analyst subagent | Market trends, salary benchmarking | 3-5 days |
| **Multi-Agent Orchestration** | multi-agent-coordinator subagent | Coordinate classifier → skill extractor → matcher | 2-3 days |
| **Legacy Modernization** | legacy-modernizer + refactoring-specialist | Fix N+1 queries, fetch-all-then-filter | 3-5 days |
| **Content Marketing** | content-marketer + seo-specialist | Blog, remote work guides, SEO optimization | 2-4 days |
| **Compliance Review** | legal-advisor subagent | GDPR DPA, EU employment law audit | 2-3 days |

### Low Priority (Future / Optional)
| Skill | Recommended Tool | Use Case | Estimated Effort |
|---|---|---|---|
| **Multi-Cloud Failover** | cloud-architect + terraform-engineer | AWS/Azure/GCP redundancy | 5-7 days |
| **Real-Time Notifications** | websocket-engineer | Live job alerts, WebSocket support | 3-4 days |
| **Advanced ML** | hugging-face-model-trainer | Fine-tune DeepSeek for EU jobs | 4-6 days |
| **Video Marketing** | remotion | Feature demos, promotional videos | 2-3 days |

---

## Subagent Adoption Roadmap

### Foundation Phase (Week 1-2)
```
nextjs-developer
├── Optimize App Router, ISR, page performance
└── Implement responsive design for EU markets

graphql-architect
├── Add N+1 query prevention (DataLoader)
└── Design skill taxonomy schema

database-administrator
├── Index optimization for job queries
└── D1 performance tuning
```

### AI Pipeline Phase (Week 3-4)
```
llm-architect
├── Multi-model routing strategy
├── Fallback logic (Claude → DeepSeek → Google)
└── Cost optimization

prompt-engineer
├── Refine "remote EU" classification prompts
├── Bias detection prompt tuning
└── Langfuse version control

nlp-engineer
├── Extract remote work signals
├── Skill extraction workflow
└── Entity recognition for salary/benefits
```

### QA & Security Phase (Week 5-6)
```
qa-expert + test-automator
├── E2E job search tests
├── Classification accuracy regression
└── Resume matching validation

security-engineer + penetration-tester
├── GraphQL API security audit
├── OWASP Top 10 scan
└── Rate limiting implementation

accessibility-tester
├── WCAG 2.1 AA compliance
├── Multi-language support testing
└── Keyboard navigation audit
```

### Product & Analytics Phase (Week 7-8)
```
product-manager
├── Remote work feature prioritization
├── User interview synthesis
└── Roadmap refinement

seo-specialist + content-marketer
├── Keyword research for EU remote jobs
├── Blog content plan
└── Social media job alerts

data-analyst + business-analyst
├── Job board metrics dashboard
├── Regional trend analysis
└── Competitor benchmarking
```

---

## Skills Gap Analysis

### Existing Gaps
| Category | Gap | Impact | Solution |
|---|---|---|---|
| **Resume Processing** | No PDF/DOCX parsing | Can't extract structured resume data | Implement pdf + docx skills |
| **Security** | No vulnerability scanning | PII leaks, GDPR violations | Adopt semgrep rules, SAST |
| **Testing** | No E2E tests | Regressions in job search | Implement Playwright suite |
| **Compliance** | No EU law audit | Legal exposure | Hire legal-advisor subagent |
| **Analytics** | Limited dashboards | Poor product insights | Add ClickHouse + data-analyst |
| **Performance** | N+1 queries, fetch-all | Slow job listings | Use refactoring-specialist |
| **DevOps** | Manual deployments | Deployment errors | Implement CI/CD (devops-engineer) |
| **Accessibility** | Not tested | Excluded EU users with disabilities | Run accessibility-tester |

---

## Quick Start: Recommended Next Steps

### 🎯 Month 1 (High Priority)
1. **Adopt document-processing skills** → Resume parsing MVP
2. **Add security scanning** → semgrep PII rules
3. **Implement web testing** → Playwright E2E suite
4. **Run accessibility audit** → Fix WCAG compliance

### 🎯 Month 2 (Medium Priority)
5. **Multi-agent coordination** → Streamline LLM pipeline
6. **Legacy refactoring** → Fix performance bottlenecks
7. **Analytics dashboard** → Market trends visibility
8. **SEO optimization** → Improve discoverability

### 🎯 Month 3+ (Nice-to-Have)
9. **Multi-cloud** → Regional failover
10. **Advanced ML** → Fine-tuned classifiers
11. **Real-time** → Live job alerts
12. **Content hub** → Remote work guides

---

## References

- **Current CLAUDE.md Issues**: 13+ performance, security, type safety issues documented
- **Primary Skills**: SKILLS-REMOTE-WORK-EU.md
- **Extended Analysis**: SKILLS-EXTENDED-ANALYSIS.md
