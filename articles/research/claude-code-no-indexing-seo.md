# SEO Strategy: Why Claude Code Doesn't Use Codebase Indexing (Agentic Search vs RAG)

**Slug:** `claude-code-no-indexing`
**Research brief:** `articles/research/claude-code-no-indexing-research.md`
**Prepared:** 2026-03-02

---

## Target Keywords

| Keyword | Monthly Volume | Difficulty | Intent | Priority |
|---|---|---|---|---|
| how does Claude Code work | est. high (10k+) | High | Informational | P1 |
| Claude Code agentic search | est. medium (1k–5k) | Low | Informational | P1 |
| Claude Code vs GitHub Copilot | est. high (10k+) | High | Commercial | P2 |
| RAG for code | est. medium (1k–5k) | Medium | Informational | P2 |
| Claude Code codebase indexing | est. medium (1k–5k) | Low | Informational | P1 |
| agentic search vs RAG | est. low–medium (500–2k) | Low | Informational | P1 |
| AI codebase understanding | est. medium (1k–3k) | Medium | Informational | P3 |
| Claude Code no RAG | est. low (200–800) | Very Low | Informational | P1 (high opportunity) |
| code indexing AI tools | est. medium (1k–5k) | Medium | Commercial | P3 |
| why Claude Code uses grep | est. low (100–500) | Very Low | Informational | P2 (high opportunity, zero competition) |

### Long-tail / Question Keywords

| Question | Estimated Volume | Notes |
|---|---|---|
| "does Claude Code index my codebase?" | est. low (100–500) | Zero-competition long-tail |
| "how does Claude Code find code in large repos?" | est. low (100–500) | FAQ-type, rich snippet opportunity |
| "is Claude Code better than Cursor for large codebases?" | est. low (200–800) | Commercial intent, buyers comparison |
| "why doesn't Claude Code use embeddings?" | est. low (<200) | Very niche, but high intent, low competition |
| "agentic search vs RAG which is better" | est. low–medium (300–1k) | Emerging search as topic gains traction in 2026 |

---

## Search Intent Analysis

The dominant intent across this cluster is **informational** — developers want to understand how Claude Code works under the hood and why Anthropic made architectural choices that differ from tools like Cursor or GitHub Copilot. A meaningful secondary tier is **commercial/comparative**: developers evaluating which AI coding tool to adopt for their team are searching the Claude Code vs. Copilot/Cursor landscape and landing on codebase understanding as a decision factor. The Hacker News angle (Boris Cherny's direct admission that early Claude Code tried RAG and abandoned it) gives this content a **transparency/primary source** quality that pure marketing content cannot replicate. Searchers clicking on "Claude Code agentic search" or "Claude Code no RAG" are builders — engineers who read source code, contribute to open source, and share links. Capturing them means the article needs to be technically credible and take a clear, defensible position.

---

## Competitive Landscape

| Rank | Title | Domain | Format | Est. Word Count | Gap |
|---|---|---|---|---|---|
| 1 | "Settling the RAG Debate: Why Claude Code Dropped Vector DB-Based RAG" | smartscope.blog | Analysis | ~2,000 | Good technical depth but no H/N primary source; no comparison table |
| 2 | "Why I'm Against Claude Code's Grep-Only Retrieval? It Just Burns Too Many Tokens" | milvus.io | Opinion/counter | ~1,500 | Counter-argument piece (Milvus has commercial interest in vector DB); useful as "steel man" reference |
| 3 | "Why Claude Code is special for not doing RAG/Vector Search" | zerofilter.medium.com | Analysis | ~1,200 | Medium paywall; lacks structured tool comparison; no code examples |
| 4 | "Claude Code vs GitHub Copilot: The Semantic Search Divide" | stride.build | Comparison | ~1,800 | Frames it as binary; doesn't explain the internal tool ecosystem (Glob/Grep/Read) |
| 5 | "Why Grep Beat Embeddings in Our SWE-Bench Agent" | jxnl.co | Technical case study | ~2,500 | Best technical piece; about Augment's approach, not Claude Code specifically |

### What's Missing Across All Competitors

1. A clear, illustrated explanation of the three-tool hierarchy (Glob → Grep → Read) with cost framing
2. The original Boris Cherny / Hacker News primary source cited and quoted directly
3. Honest tradeoffs presented neutrally (not a product pitch for either camp)
4. The community-built alternatives (Claude Context MCP, GrepAI, ast-grep) acknowledged
5. A concrete example of when agentic search wins and when it fails — using a real function name like `createD1HttpClient`
6. The sub-agent/Explore agent explanation (read-only Haiku model, separate context window)

---

## Recommended Structure

- **Format:** Technical analysis with opinion — "here's how it works, here's the tradeoff, here's what it means for you"
- **Word count:** 1,000–1,400 words (matches reader attention span for developer-focused technical explainers; long enough for credibility, short enough to read in full)
- **Title tag:** `Why Claude Code Skips RAG: Agentic Search Explained`
- **Meta description:** `Claude Code doesn't index your codebase or use vector embeddings. It greps on the fly. Here's why Anthropic made that call — and what it costs you.` (157 chars)
- **H1:** `Claude Code Doesn't Index Your Codebase. Here's What It Does Instead.`
- **URL slug:** `/blog/claude-code-no-indexing` or `/articles/claude-code-agentic-search`

### H2 Structure

1. **The Confession: Claude Code's Creator Said It Plainly on Hacker News** — anchor with the Boris Cherny quote; establishes credibility and search hook for "Claude Code no RAG"
2. **What Agentic Search Actually Means (and the Tools Behind It)** — explain Glob / Grep / Read hierarchy with cost framing; second keyword anchor "Claude Code agentic search"
3. **Why Anthropic Chose Grep Over Embeddings** — core argument: precision over fuzzy retrieval; surface the "createD1HttpClient" example; hit "RAG for code" keyword naturally
4. **The Real Tradeoffs: When Grep Wins and When It Doesn't** — token cost criticism; large-repo limits; Milvus counter-argument referenced; "agentic search vs RAG" keyword anchor
5. **What the Community Built to Fill the Gap** — Claude Context MCP, GrepAI, ast-grep; signals awareness of ecosystem without undermining the article's thesis
6. **The Bottom Line: Precision by Design** — brief conclusion; reinforces "how does Claude Code work" for featured snippet eligibility

### H3 Opportunities (within sections)

- Under H2-2: "Glob: The Cheap First Pass", "Grep: Pattern Matching at Scale", "Read: The Expensive One", "Explore Agents: Preserving Your Main Context Window"
- Under H2-4: "The Token Cost Problem", "The Semantic Miss Problem"

---

## Featured Snippet Targeting

Two Q&A snippets to optimize for:

**Q:** Does Claude Code index your codebase?
**A (target):** No. Claude Code does not pre-index your codebase or use vector embeddings. Instead, it uses a set of filesystem tools — Glob for file pattern matching, Grep for content search, and Read for loading specific files — to explore code on demand as it works through each task. Anthropic calls this "agentic search."

**Q:** Why doesn't Claude Code use RAG?
**A (target):** Claude Code's creator, Boris Cherny, explained on Hacker News that early versions did use RAG with a local vector database, but the team found agentic search consistently outperformed it. The main reasons were precision (grep finds exact matches, embeddings introduce fuzzy positives), simplicity, and no staleness problem (a pre-built index can drift from the actual code).

Place these as short paragraphs immediately after the H2 heading, before elaboration — Google pulls the first substantial paragraph for featured snippets.

---

## Internal Linking Opportunities

| Target page on nomadically.work | Anchor text | Placement |
|---|---|---|
| Job listings page (remote EU AI engineering roles) | "remote EU AI engineering roles" | In closing paragraph or distribution blurb |
| Any article on AI coding tools / Cursor / Copilot (if exists) | "AI coding tool comparison" | Within competitive landscape section |
| Any article on RAG or LLM infrastructure (if exists) | "how RAG works for code" | Within H2-3 or H2-4 |

Note: If internal articles on these topics do not yet exist, hold anchor text placeholders and link when published. Do not link to unrelated job board pages from within technical content — it damages topical authority signals.

---

## Differentiation Strategy

The existing content on this topic falls into two camps: (1) purely technical explainers that explain the mechanism without opinion, or (2) vendor pieces arguing for one approach over the other (Milvus pushing vectors, Cursor pushing indexing). The opportunity is to be the piece that:

1. **Names the primary source** — the Boris Cherny Hacker News thread is referenced across articles but rarely quoted directly and linked properly. Anchor to it.
2. **Shows the internal tool cost model** — Glob/Grep/Read with "lightweight vs heavy" framing is not clearly diagrammed anywhere. A simple table or illustration makes this the reference article.
3. **Is honest about limits** — the Milvus counter-argument (token burns, no semantic miss recovery) is valid. Acknowledging it makes the piece more credible and keeps developers reading rather than bouncing.
4. **Gives a concrete example** — `createD1HttpClient` as the grep target (or any real function name) makes the precision argument visceral. Every competitor uses abstract language. We use code.
5. **Treats developers as builders** — frame the community-built alternatives (Claude Context, ast-grep) as legitimate engineering responses, not threats. This earns HN credibility.

---

## Distribution Notes

### Primary channels

- **Hacker News** — Submit under "Ask HN" or "Show HN" framing: "Show HN: Why Claude Code uses grep instead of RAG — the tradeoffs (article)". Target low-competition post time (Tuesday 9–11am ET). The HN angle is already baked into the thesis; lean into it. This is the highest-leverage distribution channel for this specific article.
- **DEV.to / Hashnode** — Cross-post 48h after publication. Tag: `#claudecode`, `#ai`, `#webdev`, `#programming`. Canonical URL back to nomadically.work.
- **X / Twitter** — Thread format: start with the Cherny quote, walk through the tool hierarchy, end with the tradeoffs. Link to full article. Target AI engineering and tools communities.

### Backlink potential

- **SmartScope.blog and jxnl.co** are both link-able by reaching out directly — they are independent technical blogs that cover this exact space and may link to a well-cited primary-source article.
- **Milvus blog** could link to the article as a "counterpoint" reference — they already wrote the opposing take.
- **Hacker News comments** — If the HN submission gains traction, the article URL will appear in thread links, which drives organic referral traffic independent of Google.

### Social proof angle

The Boris Cherny quote from X/Twitter (`@bcherny`) can be embedded as a blockquote. This gives the article a visual anchor and signals primary sourcing — important for developer audiences who distrust paraphrased claims.

---

## Notes for Writer

- Do not bury the Hacker News primary source. Lead with it or use it as the hook in the first 100 words.
- The tone brief says "slightly opinionated, honest about tradeoffs" — do not waver from this. The piece should have a clear conclusion but acknowledge where agentic search loses.
- Avoid the phrase "cutting-edge" — developer audiences read it as marketing. Use "deliberate" or "principled" when describing Anthropic's choice.
- The word "agentic" is search-relevant — use it consistently but define it on first use (do not assume all readers know it).
- Code examples matter more than diagrams for this audience. One concrete grep example (`grep -r "createD1HttpClient" .`) is worth two paragraphs of explanation.
- The article does NOT need to sell nomadically.work's job board directly. Topical authority on AI engineering tools is the goal; job board discovery is a downstream benefit.
