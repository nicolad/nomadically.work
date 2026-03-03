# Research Brief: Claude Code Doesn't Index Your Codebase — It Uses Agentic Search Instead

**Slug:** claude-code-no-indexing
**Topic:** How Claude Code's agentic search architecture works, why Anthropic abandoned RAG, and how this compares to Cursor, Copilot, and Windsurf
**Target audience:** Developers curious about AI coding tool internals; technically sophisticated but not AI researchers
**Tone:** Technical, opinionated, honest about tradeoffs
**Version:** Deep research pass (expansion of previous brief)

---

## Summary

Claude Code deliberately avoids codebase indexing and vector embeddings. Instead it uses what its creator Boris Cherny calls "agentic search" — a model-driven loop of Glob, Grep, Read, and isolated sub-agent context windows. Early RAG experiments were explicitly abandoned. This is a significant architectural bet, and it cuts against the design of every major competing AI coding tool: Cursor uses Merkle-tree-synced vector embeddings in Turbopuffer, Windsurf builds local AST-level semantic indexes, and GitHub Copilot runs a transformer-based semantic embedding pipeline backed by GitHub's own API. Claude Code's approach has genuine advantages (privacy, freshness, exactness) and real costs (token burn, no semantic understanding of renamed functions or cross-paradigm concepts). The debate is active — Milvus, Relace, and a live HN thread all contest whether agentic search alone is sufficient. Meanwhile Anthropic's own research and engineering blog posts describe the philosophical case: agents with tools should retrieve dynamically, not from static pre-built indexes.

---

## Key Facts

- **Primary source quote (Boris Cherny, X/Twitter, replying to @EthanLipnik):** "Early versions of Claude Code used RAG + a local vector db, but we found pretty quickly that agentic search generally works better. It is also simpler and doesn't have the same issues around security, privacy, staleness, and reliability." — Source: [x.com/bcherny/status/2017824286489383315](https://x.com/bcherny/status/2017824286489383315)

- **Hacker News engineer confirmation:** A Claude engineer commented directly on HN: "Right — Claude Code doesn't use RAG currently. In our testing we found that agentic search outperformed [it] by a lot, and this was surprising." — Source: [news.ycombinator.com/item?id=43164253](https://news.ycombinator.com/item?id=43164253)

- **Concurrent HN comment on the precision advantage:** "One of the silver bullets of Claude, in the context of coding, is that it does N[ot use RAG]..." — Source: [news.ycombinator.com/item?id=43164089](https://news.ycombinator.com/item?id=43164089)

- **Boris Cherny background:** Principal Software Engineer at Meta before joining Anthropic. Created Claude Code as an internal experiment, initially just to learn the Anthropic API. The "spark" came when he gave the model a bash tool and it autonomously wrote AppleScript to query his music player — proving agents with tools beat scripted retrieval.

- **18 built-in tools:** Reverse engineering of Claude Code's minified JS/TS (50,000+ lines, de-obfuscated by BrightCoding) confirms 18 built-in tools including Bash, Grep, Glob, Read, WebFetch, AskUserQuestion, and the Task tool for spawning sub-agents. — Source: [blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/](https://www.blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/)

- **System prompt repository:** The Piebald-AI GitHub repo publicly tracks all of Claude Code's system prompt parts and sub-agent prompts (Plan/Explore/Task), updated within minutes of each Claude Code release. Three distinct sub-agent prompt types exist: Explore (516 tokens), Plan mode enhanced (633 tokens), Task tool (294 tokens). — Source: [github.com/Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts)

- **92% prompt prefix reuse rate:** LMCache analysis of Claude Code's agentic loop found a 92% prompt reuse rate across all phases, even higher for ReAct-based subagent loops. This means processing 2M input tokens without caching costs $6.00; with prefix caching it drops to $1.152 — an 81% cost reduction. — Source: [blog.lmcache.ai/en/2025/12/23/context-engineering-reuse-pattern-under-the-hood-of-claude-code/](https://blog.lmcache.ai/en/2025/12/23/context-engineering-reuse-pattern-under-the-hood-of-claude-code/)

- **200K token pricing cliff:** Requests exceeding 200K input tokens trigger 2x pricing on ALL tokens in the request ($6.00/$22.50 per million vs $3.00/$15.00). Agentic search that runs dozens of grep/glob calls must navigate this cliff carefully. — Source: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)

- **Cursor's indexing architecture:** Cursor computes a Merkle tree of hashes of all valid files, sends delta diffs to AWS-cached embedding storage, and queries Turbopuffer (serverless vector + full-text search) at inference time. Indexing time dropped from median 7.87s to 525ms. Only metadata (masked paths, line ranges) is stored in the cloud — actual source code stays local. — Source: [read.engineerscodex.com/p/how-cursor-indexes-codebases-fast](https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast)

- **Windsurf's AST-level indexing:** Windsurf indexes at the AST entity level (function, method, class) rather than file chunks or naive text splitting, using an intelligent local RAG system. Indexing starts immediately on workspace open and stays updated automatically. — Source: [docs.windsurf.com/context-awareness/remote-indexing](https://docs.windsurf.com/context-awareness/remote-indexing)

- **GitHub Copilot semantic search:** Generally available since March 2025. Uses a proprietary transformer-based embedding model optimized for source code (similar in architecture to text-embedding-ada-002 but code-tuned). For projects under 750 files, VS Code builds a local advanced index; 750–2500 files requires manual trigger; above 2500 falls back to basic index. — Source: [github.blog/changelog/2025-03-12-instant-semantic-code-search-indexing-now-generally-available-for-github-copilot/](https://github.blog/changelog/2025-03-12-instant-semantic-code-search-indexing-now-generally-available-for-github-copilot/)

- **Relace parallel tool call optimization:** Relace built Fast Agentic Search (FAS), a code-specific sub-agent trained with RL to call 4–12 tools in parallel. Result: 4x reduction in end-to-end latency, reducing 20 sequential turns to 5 turns and 10 turns to 4 turns, while maintaining accuracy comparable to Claude Sonnet 4.5. Each tool call takes 1–2 seconds; parallelizing cuts per-turn time from 12–24 seconds to 1–2 seconds. — Source: [relace.ai/blog/fast-agentic-search](https://relace.ai/blog/fast-agentic-search)

- **Milvus critique — token burn:** Milvus published a direct critique: "Grep is a dead end that drowns you in irrelevant matches, burns tokens, and stalls your workflow. Without semantic understanding, it's like asking your AI to debug blindfolded." Proposes Claude Context (vector MCP plugin) as a hybrid fix claiming 40% token reduction. — Source: [milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md](https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md)

- **Token cost for heavy API usage:** Heavy coding sessions via the API can exceed $3,650/month, making Claude Max ($200/month) approximately 18x cheaper than raw API for intensive use. — Source: [code.claude.com/docs/en/costs](https://code.claude.com/docs/en/costs)

- **Anthropic engineering blog — effective context engineering:** Published September 29, 2025. Key quote: "Good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome." Teams augment retrieval systems with "just in time" context strategies — agents maintain lightweight identifiers (file paths, stored queries) and use tools to load data at runtime. — Source: [anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

- **Anthropic building effective agents:** Published December 2024. Core principle: "The most successful implementations use simple, composable patterns rather than complex frameworks." The basic building block: LLM enhanced with retrieval, tools, and memory — with the model generating its own search queries rather than receiving pre-retrieved context. — Source: [anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents)

- **Boris Cherny on agent topology:** Cherny believes the future of development lies in "agent topologies" — multiple agents working in parallel with fresh context windows — to avoid "polluted" memory across long sessions. — Source: [ycombinator.com/library/NJ-inside-claude-code-with-its-creator-boris-cherny](https://www.ycombinator.com/library/NJ-inside-claude-code-with-its-creator-boris-cherny)

- **George Sung LLM traffic tracing (January 2026):** Forked Ollama v0.14.2 to intercept API traffic, confirmed: Claude Code runs an agentic loop where it chains tool calls until sub-agents complete requests, then summarizes results. Published full system prompts and tool lists for both main agent and sub-agents in the article appendix. — Source: [medium.com/@georgesung/tracing-claude-codes-llm-traffic-agentic-loop-sub-agents-tool-use-prompts-7796941806f5](https://medium.com/@georgesung/tracing-claude-codes-llm-traffic-agentic-loop-sub-agents-tool-use-prompts-7796941806f5)

- **Kir Shatrov reverse engineering:** Used mitmproxy to intercept Claude Code's API traffic, confirming the system prompts, tool list injection, and agentic loop structure. — Source: [kirshatrov.com/posts/claude-code-internals](https://kirshatrov.com/posts/claude-code-internals)

- **MCP dual-nature:** Claude Code is simultaneously an MCP client (connecting to external tool servers) and an MCP server (exposing its own file editing and command execution tools to other MCP clients like Claude Desktop, Cursor, and Windsurf). — Source: [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)

- **Latent Space podcast — Boris and Cat, May 2025:** Boris described Claude Code as "not a product, more like a Unix utility." Key design principle: "do the simple thing first." Memory: a markdown file that gets auto-loaded. Prompt summarization: done simply. — Source: [latent.space/p/claude-code](https://www.latent.space/p/claude-code)

- **Every.to podcast — founding engineers, October 2025:** Cat Wu and Boris Cherny interviewed by Dan Shipper. Traced origin from internal experiment. Discussed subagent philosophy, slash commands, practical tips from Anthropic's internal engineering team. — Source: [every.to/podcast/transcript-how-to-use-claude-code-like-the-people-who-built-it](https://every.to/podcast/transcript-how-to-use-claude-code-like-the-people-who-built-it)

- **Lenny's Newsletter podcast — February 19, 2026:** Boris Cherny on "what happens after coding is solved." Discussed the end of "software engineer" as a title, agentic futures, and productivity compounding. — Source: [lennysnewsletter.com/p/head-of-claude-code-what-happens](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)

---

## Data Points

| Metric | Value | Source | Date |
|---|---|---|---|
| Claude Code prompt prefix reuse rate | 92% | LMCache blog | Dec 2025 |
| Cost savings from prefix caching (2M token session) | 81% | LMCache blog | Dec 2025 |
| Relace FAS latency reduction vs sequential | 4x | Relace blog | 2025 |
| Relace FAS turn reduction (20→5, 10→4) | 60–75% fewer turns | Relace blog | 2025 |
| Cursor codebase indexing time (after optimization) | 525ms median | Engineers Codex | 2025 |
| Cursor codebase indexing time (before optimization) | 7.87s median | Engineers Codex | 2025 |
| GitHub Copilot local index threshold | <750 files (auto), 750–2500 (manual) | GitHub Docs | Mar 2025 |
| Claude Code built-in tools | 18 confirmed | BrightCoding reverse engineering | Jul 2025 |
| Claude Code system prompt components | Multiple conditional sections + 3 sub-agent prompt types | Piebald-AI repo | Updated per version |
| Claude API pricing cliff (input tokens) | $3→$6 per million tokens at >200K input | Anthropic docs | 2025–2026 |
| Milvus claimed token reduction with hybrid vector | 40% | Milvus blog | 2025 |
| HN item on Claude Code RAG admission | item 43164253 | Hacker News | 2025 |
| Ask HN agentic vs RAG production discussion | item 47134263 | Hacker News | 2026 |
| Piebald-AI Explore agent prompt size | 516 tokens | Piebald-AI repo | 2025–2026 |
| Piebald-AI Plan agent prompt size | 633 tokens | Piebald-AI repo | 2025–2026 |
| Piebald-AI Task tool agent prompt size | 294 tokens | Piebald-AI repo | 2025–2026 |
| Claude Max subscription cost | $200/month | Anthropic | 2026 |
| Heavy API coding session estimated cost | $3,650+/month | Anthropic docs | 2026 |

---

## Sources

### Primary Sources (Boris Cherny / Anthropic)
1. [Boris Cherny on X — RAG abandoned quote](https://x.com/bcherny/status/2017824286489383315) — The primary source quote on early RAG experiments and why they were dropped
2. [Hacker News — Claude engineer admission (item 43164253)](https://news.ycombinator.com/item?id=43164253) — Direct HN comment from Claude engineer confirming no RAG + "this was surprising"
3. [Hacker News — silver bullets comment (item 43164089)](https://news.ycombinator.com/item?id=43164089) — Community reaction to the no-RAG architecture
4. [Inside Claude Code with Boris Cherny — YC Startup Library](https://www.ycombinator.com/library/NJ-inside-claude-code-with-its-creator-boris-cherny) — Origin story, agent topology philosophy
5. [Head of Claude Code: What happens after coding is solved — Lenny's Newsletter, Feb 2026](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) — Most recent major Cherny interview
6. [Transcript: How to Use Claude Code Like the People Who Built It — Every.to](https://every.to/podcast/transcript-how-to-use-claude-code-like-the-people-who-built-it) — Cat Wu + Boris Cherny, Oct 2025
7. [Claude Code: Anthropic's Agent in Your Terminal — Latent Space Podcast](https://www.latent.space/p/claude-code) — "Claude Code is a Unix utility, not a product"
8. [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — Philosophical foundation for agentic retrieval over static RAG
9. [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Sep 29, 2025. Just-in-time retrieval, context tightness principle
10. [Anthropic: Writing Effective Tools for AI Agents](https://www.anthropic.com/engineering/writing-tools-for-agents) — Tool design philosophy
11. [Claude Code Docs — how it works](https://code.claude.com/docs/en/overview) — Official documentation
12. [Claude Code Docs — costs](https://code.claude.com/docs/en/costs) — Pricing and cost management
13. [Claude Code Docs — sub-agents](https://code.claude.com/docs/en/sub-agents) — Official sub-agent documentation

### Reverse Engineering / Internal Analysis
14. [George Sung — Tracing Claude Code's LLM Traffic (Medium, Jan 2026)](https://medium.com/@georgesung/tracing-claude-codes-llm-traffic-agentic-loop-sub-agents-tool-use-prompts-7796941806f5) — Forked Ollama to intercept API traffic; full system prompt dumps
15. [Kir Shatrov — Reverse engineering Claude Code](https://kirshatrov.com/posts/claude-code-internals) — mitmproxy interception, confirms agentic loop structure
16. [BrightCoding — Inside Claude Code: Deep-Dive Reverse Engineering Report](https://www.blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/) — 50,000+ lines de-obfuscated, confirms 18 tools
17. [Piebald-AI/claude-code-system-prompts (GitHub)](https://github.com/Piebald-AI/claude-code-system-prompts) — All system prompts tracked per version; Explore/Plan/Task agent prompt sizes
18. [LMCache Blog — Context Engineering & Reuse Pattern Under the Hood of Claude Code](https://blog.lmcache.ai/en/2025/12/23/context-engineering-reuse-pattern-under-the-hood-of-claude-code/) — 92% prefix reuse, 81% cost savings from caching

### Competitor Architecture
19. [How Cursor Indexes Codebases Fast — Engineers Codex](https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast) — Merkle tree, Turbopuffer, AWS-cached embeddings
20. [How Cursor Actually Indexes Your Codebase — Towards Data Science](https://towardsdatascience.com/how-cursor-actually-indexes-your-codebase/) — Chunking with tree-sitter, path masking/obfuscation
21. [Cursor Codebase Indexing Docs](https://cursor.com/docs/context/codebase-indexing) — Official Cursor documentation
22. [Cursor Secure Codebase Indexing](https://cursor.com/blog/secure-codebase-indexing) — Privacy architecture of Cursor's index
23. [Windsurf Remote Indexing Docs](https://docs.windsurf.com/context-awareness/remote-indexing) — AST-level indexing, entity-level semantic blocks
24. [GitHub Copilot Semantic Search GA — GitHub Changelog, March 2025](https://github.blog/changelog/2025-03-12-instant-semantic-code-search-indexing-now-generally-available-for-github-copilot/) — Code-tuned transformer embedding model
25. [GitHub Copilot Codebase Indexing Concepts](https://docs.github.com/copilot/concepts/indexing-repositories-for-copilot-chat) — Hybrid local/remote index strategy

### Performance & Benchmarks
26. [Relace — Exploiting Parallel Tool Calls to Make Agentic Search 4x Faster](https://relace.ai/blog/fast-agentic-search) — RL-trained sub-agent, parallel tool execution, 4x latency reduction
27. [Milvus Blog — Why I'm Against Claude Code's Grep-Only Retrieval](https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md) — Strongest published critique; 40% token reduction claim
28. [Milvus Blog HN thread — item 45027634](https://news.ycombinator.com/item?id=45027634) — Community response to Milvus critique
29. [Ask HN: Agentic search vs. RAG — what's your production experience? (item 47134263)](https://news.ycombinator.com/item?id=47134263) — 2026 production practitioner debate

### Analysis & Commentary
30. [SmartScope Blog — Settling the RAG Debate](https://smartscope.blog/en/ai-development/practices/rag-debate-agentic-search-code-exploration/) — Best structured analysis of both sides
31. [Claude Code Proved the "Search Revolution" — Shinsuke Matsuda, Medium, Feb 2026](https://medium.com/@smatsuda/claude-code-proved-the-search-revolution-plan-stack-is-about-the-memory-revolution-1cd222af29d7) — Agentic search as "solved," memory as next frontier
32. [Why Claude Code is Special for Not Doing RAG/Vector Search — Aram, Medium, Feb 2026](https://zerofilter.medium.com/why-claude-code-is-special-for-not-doing-rag-vector-search-agent-search-tool-calling-versus-41b9a6c0f4d9) — Good explanation of agent search vs vector search tradeoffs
33. [Context Management with Subagents in Claude Code — RichSnapp.com](https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code) — Isolated context windows, how sub-agents preserve main session
34. [Claude Code vs Cursor — builder.io](https://www.builder.io/blog/cursor-vs-claude-code) — Side-by-side architectural comparison
35. [Zenn.dev — Why Claude Code Abandoned RAG for Agentic Search](https://zenn.dev/karamage/articles/2514cf04e0d1ac?locale=en) — Japanese dev community analysis, English available

---

## The Tool Hierarchy in Detail

### How the three-tier tool hierarchy works

**Tier 1 — Discovery (Lightweight)**
- **Glob**: Fast file pattern matching using OS filesystem, returns paths sorted by modification time. Cost: nearly zero. Use case: "find all TypeScript files in src/"
- **Grep**: Regex search powered by ripgrep (parallel processing). Returns matched lines with context. Does NOT load file contents. Cost: lightweight. Use case: "find all usages of `createD1HttpClient`"

**Tier 2 — Inspection (Moderate)**
- **Read**: Loads file contents into context with line numbers. Supports text, images, PDFs, Jupyter notebooks. This is where token cost accumulates. Claude Code reserves Read for files already confirmed relevant via Glob/Grep — treating it as a confirm step, not discovery.

**Tier 3 — Parallel Exploration (Isolated Context)**
- **Task tool / Sub-agents**: Spawns fresh context windows using lighter models (Haiku for Explore). The Explore sub-agent is read-only (Glob, Grep, Read, limited Bash — copy/move/list only). Strictly prohibited from writing or modifying files. Returns a summary to the main agent, not the raw file contents, preserving main context window space.

### The agentic loop pattern
Claude Code's core loop is `while(tool_call) → execute tool → feed results → repeat`. The loop terminates naturally when Claude produces a plain text response with no tool calls. This is the TAOR pattern: Think-Act-Observe-Repeat. The orchestrator tracks progress via a TODO tool that creates and manages task lists — demonstrating thoroughness to the user and allowing course correction.

### Prompt caching economics
Because the system prompt is large and stable (tool definitions, git status, CLAUDE.md contents), Claude Code benefits enormously from Anthropic's prompt caching. The 92% prefix reuse rate means most agentic turns pay only 10% of the base input token price for cached portions. Cache write tokens are 1.25x base cost; cache reads are 0.1x. For a heavy session, this collapses cost by 81%.

---

## Competitor Comparison Table

| Tool | Search Strategy | Where Index Lives | Privacy Model | Freshness |
|---|---|---|---|---|
| **Claude Code** | Agentic: Glob → Grep → Read → Sub-agent | No index (runtime search) | Data never leaves machine | Always current |
| **Cursor** | Semantic vector RAG + optional @Codebase | Turbopuffer (cloud) + local cache | Embeddings + masked paths in cloud | Merkle-tree delta sync; can lag |
| **Windsurf Cascade** | AST-level semantic RAG, local index | Local (+ optional remote) | Local-first; enterprise options | Auto-updated on file change |
| **GitHub Copilot** | Transformer semantic embeddings | GitHub API (remote) + local for small repos | Embeddings in GitHub cloud | Indexed per commit; local for uncommitted changes |
| **Zed AI** | Automatic context discovery (agentic-leaning) | Varies by model provider | Depends on provider | Runtime |

---

## The Privacy and Security Argument — Unpacked

Cherny's tweet cited four specific objections to RAG: security, privacy, staleness, reliability. Here's what each means concretely:

- **Security**: An index must live somewhere. If stored in the cloud, it becomes a target. Cursor's path masking (client-side hash of each path component with a secret key + fixed nonce before transmission) is a mitigation, not a solution — it adds complexity and a cryptographic dependency. Claude Code avoids this entirely.
- **Privacy**: Embeddings of your code, even as dense vectors, can leak information about proprietary logic, trade secrets, or security-sensitive patterns. Research on "embedding inversion" has shown that vectors can be partially reversed to recover original text in some settings. Agentic search: zero data leaves the machine.
- **Staleness**: An index built at time T reflects the code at time T. If you rename a function between indexing and querying, the index misses the rename. Claude Code's grep is always live against the filesystem.
- **Reliability**: Every additional system is a failure point. Vector DBs have latency spikes, embedding APIs have rate limits, sync pipelines have bugs. Claude Code has one failure mode: the filesystem.

---

## The Token Burn Problem — Unpacked

The strongest critique of agentic search is token cost for large codebases. A naive grep on a common term like `useState` in a React codebase might return hundreds of matches. Each match consumed by the model is a token. At scale:

- A 200K-token context cliff triggers 2x pricing on ALL tokens in the request
- Sub-optimal grep queries on large repos can consume 50K+ tokens before any actual work
- Each subprocess re-injection (system prompt + git status + tool definitions) costs ~50K tokens per turn when poorly managed

**Mitigations in practice:**
1. Claude Code itself is designed to use narrow, precise grep patterns rather than broad ones
2. The Explore sub-agent runs on Haiku (cheaper model) and returns summaries, not raw content
3. Prefix caching at 92% reuse rate collapses the effective cost of the stable system prompt portions
4. The model is trained to prefer Glob (returns paths, not content) before committing to Read

**Relace's parallel optimization** shows there's substantial room to improve the baseline: by executing 4–12 tool calls per turn in parallel rather than sequentially, they reduced turn count by 60–75% at the same accuracy level. This suggests the inefficiency is not fundamental to agentic search — it's an implementation detail of sequential execution.

---

## The Semantic Miss Problem — Unpacked

Critics argue grep cannot answer "where does the authentication logic live?" if the authentication module is called `auth-middleware.ts`, `session-handler.ts`, and `token-validator.ts` — none of which contain the word "authentication" in their file contents.

The counter-argument from the Claude Code team's perspective: the model compensates by running multiple searches. It might search for "auth", "session", "token", "middleware", "jwt", "bearer" — combining results to triangulate. This multi-step reasoning is something static embedding retrieval cannot do: the vector DB returns its top-k hits and that's it.

The honest answer is that both approaches have failure modes:
- Semantic embeddings miss renamed/refactored symbols (the function exists, embeddings don't know its new name)
- Agentic grep misses semantically-related code using unfamiliar vocabulary
- Hybrid approaches (Milvus's proposal, Alberto Roura's "why not both?") exist but add complexity

---

## The MCP Connection — What It Means

Claude Code is built around the Model Context Protocol, the open standard Anthropic published for AI-tool integration. The relationship:

- Claude Code's search tools (Grep, Glob, Read) ARE MCP tools — they follow the same JSON-RPC 2.0 protocol with three transport modes (stdio, HTTP, SSE)
- External tool servers plug into Claude Code's session via MCP — the filesystem search tools are first-party MCP tools running locally
- Claude Code exposes its own tools as an MCP server — other clients (Claude Desktop, Cursor, Windsurf) can invoke Claude Code's capabilities remotely
- This means agentic search is not a closed system — developers can supplement it with MCP servers that provide vector search (as the Milvus Claude Context plugin does)

The Milvus plugin demonstrates the extensibility point: the architecture isn't "grep only forever," it's "grep by default, but the tool system is open to extension." This is a meaningful distinction.

---

## Recommended Angle

The article's core argument is correct and well-grounded. The deepening opportunity is:

**Frame it as a systems design choice, not just a feature comparison.** The question Anthropic answered is: when designing an agent that navigates code, what's the right abstraction layer? Their answer: tools that operate directly on the filesystem, not tools that pre-build knowledge graphs. This connects to a deeper principle in Anthropic's engineering philosophy (visible in the "building effective agents" and "effective context engineering" posts): complexity is the enemy, and agents should retrieve just-in-time rather than retrieving everything upfront.

The counterpoint worth giving full treatment: Cursor, Copilot, and Windsurf have all bet on indexing, and they have real advantages on codebases where developers ask natural-language questions about large, unfamiliar systems. The article should acknowledge this honestly — agentic search wins on precision, freshness, and privacy; indexing wins on semantic reach and first-query latency.

The new narrative beat: the parallel tool call optimization (Relace FAS) suggests agentic search's latency problem is not fundamental — it's a sequential execution bottleneck that is being actively solved. Meanwhile the context window explosion (200K → 1M tokens) complicates the tradeoff: with a 1M token context, you could theoretically load an entire medium-sized codebase directly, making both RAG and agentic search partially redundant. Anthropic's bet on agents-plus-tools rather than static retrieval looks even more prescient in a world where context windows keep expanding.

---

## Counterarguments / Nuances

- **The "grep is semantic too" argument**: Some HN commenters argue grep qualifies as retrieval-augmented generation — you're still retrieving to augment generation. The debate over what "RAG" means is partly terminological noise.

- **Large repos at scale**: On monorepos with 500K+ files, even Glob pattern matching becomes expensive. Cursor's Merkle-tree incremental sync is genuinely more efficient than grep at that scale.

- **The semantic gap is real**: "Where does authentication happen?" cannot be answered well by grep alone on an unfamiliar codebase. Embeddings trained on code understand that `passport`, `JWT`, `OAuth`, and `session middleware` are all related concepts.

- **Privacy is not binary**: Cursor never stores raw source code in the cloud — only embeddings and masked metadata. The privacy argument for agentic search is strongest when "even embeddings are too much," which is more relevant for regulated industries than typical startups.

- **Hybrid approaches are emerging**: Alberto Roura's "Vector RAG + Agentic Search? Why Not Both?" and Milvus's Claude Context plugin both show that the architectures aren't mutually exclusive. The interesting design space is "vector prefilter to narrow candidates, then agentic confirmation." This is similar to how A-RAG (hierarchical retrieval interfaces paper from arXiv) achieves 94.5% on HotpotQA.

- **The context window counterargument**: At 1M token context, the distinction between "indexing" and "loading everything" blurs. Anthropic's own Opus model supports 1M tokens in beta. If you can fit an entire codebase in context, you don't need either RAG or agentic search — you just read everything. Neither architecture is stable as context windows expand.

---

## Needs Verification

- **The exact Boris Cherny X post timestamp and thread context** — the search results confirm the quote exists and the URL, but the full thread context (what question prompted it, exact date) should be verified directly at [x.com/bcherny/status/2017824286489383315](https://x.com/bcherny/status/2017824286489383315)
- **Which specific model runs Explore sub-agents** — multiple sources say "Haiku" but this may have changed across Claude Code versions; the Piebald-AI repo is the authoritative current source
- **Relace FAS accuracy figures** — the "comparable to Claude Sonnet 4.5" claim should be cross-checked against their published benchmark methodology
- **The 40% token reduction from Milvus Claude Context** — this is a vendor claim from the company selling the competing solution; independent verification would strengthen or weaken the article's treatment of the critique
- **Ask HN thread item 47134263** — described as a 2026 production experience discussion; the content of top comments should be checked directly for specific quotes
- **Whether Windsurf indexes remotely by default or locally** — the docs describe both options; the default depends on plan tier (needs verification)

---

## Suggested Structure for Article Deepening

1. **Open**: The tweet that changed how developers think about AI coding tools — Boris Cherny's X post confirming early RAG experiments were abandoned (use the direct quote as a lede)

2. **Section: How agentic search actually works** — the three-tier tool hierarchy (Glob → Grep → Read → Sub-agent), the agentic loop mechanics, the TAOR pattern, how Explore sub-agents use isolated context windows. Reference the Piebald-AI repo and reverse engineering work for credibility.

3. **Section: Why Anthropic's engineers were surprised** — the HN comment: "agentic search outperformed [RAG] by a lot, and this was surprising." Unpack why: precision advantage for code symbols, no staleness, no data leaving the machine.

4. **Section: How the competition does it** — Cursor (Merkle trees + Turbopuffer), Windsurf (AST-level local index), GitHub Copilot (code-tuned transformer embeddings, GA March 2025). The privacy tradeoffs each makes. Cursor's path masking approach.

5. **Section: The real costs of agentic search** — token burn, the 200K pricing cliff, the 50K-token subprocess tax, the semantic miss problem. Quote the Milvus critique. Show it's a genuine engineering tradeoff, not a free lunch.

6. **Section: The parallel tool call fix** — Relace FAS achieving 4x latency reduction via RL-trained sub-agent calling 4–12 tools in parallel. The bottleneck is sequential execution, not agentic search itself.

7. **Section: Where this is going** — context window economics (1M token window blurs the distinction), MCP extensibility (hybrid approaches are a plugin away), Anthropic's "just in time" context engineering philosophy as the north star.

8. **Close**: Boris Cherny's broader philosophy — agents with fresh context windows, no polluted memory, parallel topology. The architecture of Claude Code is a preview of how Anthropic thinks agents should work generally: explore dynamically, retrieve on demand, cache aggressively, stay local.
