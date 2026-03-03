---
title: "Claude Code Doesn't Index Your Codebase. Here's What It Does Instead."
description: "Claude Code uses agentic search — Glob, Grep, Read — instead of RAG or vector embeddings. The creator explained why on HN. Here are the tradeoffs, the economics, and when each approach wins."
date: "2026-03-03"
author: "Vadim Nicolai"
tags: ["claude-code", "agentic-search", "RAG", "coding-assistants", "context-engineering"]
status: published
last-verified: "2026-03-03"
---

# Claude Code Doesn't Index Your Codebase. Here's What It Does Instead.

*Last verified: March 2026*

Boris Cherny's team built RAG into early Claude Code. They tested it against agentic search. Agentic search won — not narrowly. A Claude engineer confirmed it in a Hacker News thread: "In our testing we found that agentic search outperformed [it] by a lot, and this was surprising."

That thread is the clearest primary source on how Claude Code actually works — and why it works that way. Most articles on the topic paraphrase it from memory. This one starts from the source.

> **Q: Does Claude Code index your codebase?**
> **A:** No. Claude Code does not pre-index your codebase or use vector embeddings. Instead, it uses filesystem tools — Glob for file pattern matching, Grep for content search, and Read for loading specific files — to explore code on demand as it works through each task. Anthropic calls this "agentic search."

---

## The Confession: What Boris Cherny Actually Said

In a [public Hacker News thread](https://news.ycombinator.com/item?id=43164253), Boris Cherny — principal software engineer at Anthropic and Claude Code's creator — wrote this directly:

> "Early versions of Claude Code used RAG + a local vector db, but we found pretty quickly that agentic search generally works better. It is also simpler and doesn't have the same issues around security, privacy, staleness, and reliability."

That post on [X/Twitter](https://x.com/bcherny/status/2017824286489383315) was followed by a comment from a Claude engineer in the same HN thread: "Right — Claude Code doesn't use RAG currently. In our testing we found that agentic search outperformed [it] by a lot, and this was surprising."

The "surprising" qualifier matters. This was not a story where the team started with a principled position and built to confirm it. They built RAG, tested it, found it underperformed, and redesigned. The result is an architecture that runs against the grain of every major competing tool — and the gap is not accidental.

Cherny's background shapes how to read this decision. Before Anthropic, he was a principal engineer at Meta. He describes Claude Code's origin as a personal experiment: he gave the model a bash tool, watched it autonomously write AppleScript to query his music library, and realized the implication. An agent with tools beats a script with pre-retrieved context. That insight drove Claude Code's entire design. The [YC Startup Library interview](https://www.ycombinator.com/library/NJ-inside-claude-code-with-its-creator-boris-cherny) goes deeper on this philosophy: Cherny believes the future of development lies in "agent topologies" — multiple agents with fresh, isolated context windows working in parallel, not a single large agent with accumulated, polluted memory.

The architectural bet against indexing is downstream from that belief.

---

## How Claude Code Actually Searches Your Code

"Agentic" means the model drives the search process rather than receiving pre-retrieved context. Claude Code decides what to look for, picks the right tool, acts on the result, and loops until it has enough to complete the task. The loop is think → act → observe → repeat, continuing until the model produces a plain text response with no tool call attached.

What makes this work in practice is that the tools have very different cost profiles — and Claude Code is designed to use them in cost order.

### The Tool Hierarchy with Token Economics

| Tool | What It Does | Token Cost | Use Case |
|---|---|---|---|
| **Glob** | File path pattern matching | Near-zero — returns paths only | `workers/**/*.toml`, `src/**/*.graphql` |
| **Grep** | Regex content search (powered by ripgrep) | Lightweight — returns matching lines | `createD1HttpClient`, `is_remote_eu` |
| **Read** | Full file contents into context | Heavy — 500–5,000 tokens per file | Confirm and load a specific file |
| **Explore agent** | Isolated read-only sub-agent (Haiku model) | Isolated — does not touch main context window | Deep codebase exploration across many files |

Eighteen built-in tools are confirmed in [BrightCoding's reverse-engineering of Claude Code's minified JS](https://www.blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/), including Bash, Grep, Glob, Read, WebFetch, and the Task tool that spawns sub-agents. The [Piebald-AI GitHub repo](https://github.com/Piebald-AI/claude-code-system-prompts) tracks all system prompt components and sub-agent prompts per version, updated within minutes of each Claude Code release. [George Sung independently confirmed](https://medium.com/@georgesung/tracing-claude-codes-llm-traffic-agentic-loop-sub-agents-tool-use-prompts-7796941806f5) the same loop structure in January 2026 by forking Ollama to intercept API traffic.

**Glob** is the opening move. `workers/**/*.toml` costs almost nothing — it returns file paths, not file contents. Claude Code uses Glob to narrow the search space before any expensive operations begin.

**Grep** does heavier lifting: searching file contents by regex. Running `grep -r "createD1HttpClient" .` returns every line containing that string, with surrounding context. It is fast, exact, and composable. Claude Code chains Grep calls the way a developer would in a terminal — each search informed by the previous result, progressively narrowing toward the relevant files.

```bash
# The kind of grep chain Claude Code runs:
grep -r "createD1HttpClient" src/
grep -r "D1HttpClient" src/db/
grep -r "import.*d1-http" src/
```

**Read** loads a full file into the context window. A 200-line TypeScript file costs roughly 500–1,500 tokens. Claude Code reserves Read for files already identified as relevant via Glob and Grep — it is the confirm step, not the discovery tool.

### The Explore Sub-Agent Architecture

For deep exploration, Claude Code spawns an Explore sub-agent: a read-only specialist that runs on the Haiku model inside its own isolated context window. The [Piebald-AI repo](https://github.com/Piebald-AI/claude-code-system-prompts) documents three sub-agent prompt types with their sizes as of current versions: Explore agent (516 tokens), Plan mode enhanced (633 tokens), Task tool (294 tokens).

The Explore agent can Glob, Grep, Read, and run limited Bash (list, copy, move). It cannot create or modify files. When it finishes, it returns a summary to the main agent — not raw file contents. That summary preserves the insight while discarding the tokens.

This is the key isolation property: exploration work does not consume the main conversation's context budget. Cherny has described this as essential to his "agent topologies" philosophy — fresh context windows prevent the main session from accumulating irrelevant content from early searches that turned out to be dead ends.

> **Q: How does Claude Code search code in large repositories?**
> **A:** Claude Code uses a three-tool hierarchy: Glob (lightweight file path pattern matching), Grep (content search returning matching lines), and Read (full file content into context). For deep exploration, it spawns an Explore sub-agent — a read-only Haiku model with its own isolated context window — to keep heavy search from consuming the main conversation's token budget.

---

## The Economics: Why This Approach Is Viable at Scale

The most important financial fact about Claude Code's architecture is the 92% prompt prefix reuse rate. [LMCache's December 2025 analysis](https://blog.lmcache.ai/en/2025/12/23/context-engineering-reuse-pattern-under-the-hood-of-claude-code/) found that across all phases of Claude Code's agentic loop — including the ReAct-based sub-agent loops — the same prefix (system prompt, tool definitions, CLAUDE.md contents) appears in 92% of turns.

This matters because of how Anthropic's prompt caching works: cache write tokens cost 1.25x base price, but cache read tokens cost only 0.1x. For a 2M-token session, processing without caching costs $6.00. With prefix caching at 92% reuse, that drops to $1.152 — an 81% cost reduction.

Without this, the "burn tokens iteratively" critique would be damning. With it, the economics of agentic search become defensible even on large codebases.

There is a real pricing cliff to understand. Claude API input tokens are priced at $3/million up to 200K tokens per request; beyond 200K, all tokens in that request cost $6/million — a 2x jump. Agentic sessions that accumulate significant context must manage this cliff deliberately. [Anthropic's cost documentation](https://code.claude.com/docs/en/costs) estimates heavy API coding sessions at $3,650+/month. Claude Max at $200/month works out to approximately 18x cheaper for intensive use — which is why most developers using Claude Code heavily are on the subscription plan rather than the API.

The latency problem with sequential tool calls is real — but being solved. [Relace's Fast Agentic Search (FAS)](https://relace.ai/blog/fast-agentic-search) showed what is possible: an RL-trained sub-agent calling 4–12 tools in parallel instead of sequentially. Each sequential tool call takes 1–2 seconds; 20 sequential turns means 20–40 seconds of latency. FAS reduced 20 turns to 5 and 10 turns to 4, a 4x latency reduction, while maintaining accuracy comparable to Claude Sonnet 4.5. The bottleneck is sequential execution, not the agentic approach itself.

---

## How the Competition Does It: Cursor, Windsurf, and Copilot

Claude Code's no-index bet cuts against the design of every major competing tool.

| Tool | Search Strategy | Index Location | Privacy Model | Freshness |
|---|---|---|---|---|
| **Claude Code** | Agentic: Glob → Grep → Read → Explore agents | No index (runtime search) | Data never leaves machine | Always current (filesystem reads) |
| **Cursor** | Semantic vector RAG + optional @Codebase | Turbopuffer (cloud) + local cache | Embeddings + masked paths in cloud | Merkle-tree delta sync; incremental lag |
| **Windsurf Cascade** | AST-level semantic RAG, local index | Local (+ optional remote) | Local-first; enterprise options | Auto-updated on file change |
| **GitHub Copilot** | Code-tuned transformer embeddings | GitHub API (remote) + local for <750 files | Embeddings in GitHub cloud | Indexed per commit; local for uncommitted |
| **Zed AI** | Automatic context discovery (agentic-leaning) | Varies by model provider | Depends on provider | Runtime |

**Cursor** is the most technically detailed comparison. The [Engineers Codex analysis](https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast) documents the full pipeline: Cursor computes a Merkle tree of hashes of all valid files, sends delta diffs to AWS-cached embedding storage, and queries [Turbopuffer](https://turbopuffer.com) — a serverless vector and full-text search engine — at inference time. Only metadata is stored in the cloud: masked paths (each path component hashed with a secret key and fixed nonce), line ranges, and embedding vectors. Raw source code never leaves the machine. Indexing time dropped from a median of 7.87s to 525ms after optimization. Cursor shows an index status indicator; Claude Code shows nothing, because nothing needs to build.

**Windsurf Cascade** takes a different approach: AST-level indexing, building semantic blocks at function, method, and class boundaries rather than naive text chunks. The index starts immediately on workspace open and stays updated automatically on file change. It is local-first, which gives it the freshness advantage of no sync lag.

**GitHub Copilot** went generally available with semantic search in [March 2025](https://github.blog/changelog/2025-03-12-instant-semantic-code-search-indexing-now-generally-available-for-github-copilot/). The embedding model is a proprietary transformer fine-tuned on source code. For projects under 750 files, VS Code builds a local advanced index automatically; 750–2,500 files requires a manual trigger; above 2,500 falls back to a basic index. Uncommitted changes use a hybrid local approach.

The user experience difference is immediate: Cursor and Copilot require a setup phase with progress indicators. Claude Code requires nothing. That zero-friction start is not just UX polish — it reflects the architecture. There is genuinely nothing to build.

> **Q: What is the difference between Claude Code and Cursor indexing?**
> **A:** Cursor proactively indexes your codebase using tree-sitter chunking and vector embeddings stored in Turbopuffer, updated incrementally via Merkle tree sync. Claude Code does not index at all — it searches on demand using grep-style exact-match tools. Cursor wins on semantic and conceptual search; Claude Code wins on precision, freshness, and zero setup time.

---

## Why Anthropic Chose Grep Over Embeddings

> **Q: Why doesn't Claude Code use RAG?**
> **A:** Claude Code's creator Boris Cherny explained on Hacker News that early versions did use RAG with a local vector database, but the team found agentic search consistently outperformed it. The main reasons: precision (grep finds exact matches, embeddings introduce fuzzy positives), simplicity (no index to build or maintain), freshness (a pre-built index drifts from code during active editing), and privacy (no data leaves the machine for embedding computation).

The precision argument is the strongest one for code specifically. `createD1HttpClient` either appears in a file or it does not. There is no fuzzy positive. Vector embeddings can surface "conceptually adjacent" code that shares no tokens with the target symbol — and in a coding context, conceptual adjacency without textual match is usually noise, not signal.

There is also academic validation. An [Amazon Science paper published February 2026](https://arxiv.org/abs/2602.23368) (arXiv 2602.23368, "Keyword Search Is All You Need") ran a systematic comparison of RAG against agentic keyword search across retrieval tasks and found that keyword search via agentic tool use achieves over 90% of RAG-level performance without a vector database. The benchmark focused on document Q&A rather than code navigation specifically — but the principle that exact-match retrieval with iterative refinement competes with semantic search holds in the code context where symbols are precise by definition.

Anthropic's own engineering blog makes the philosophical case explicit. Their September 2025 post, ["Effective Context Engineering for AI Agents"](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), states: "Good context engineering means finding the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome." The "just in time" framing is key — agents should maintain lightweight identifiers (file paths, function names) and load data at runtime rather than pre-loading a large static context.

The December 2024 ["Building Effective Agents"](https://www.anthropic.com/research/building-effective-agents) post reinforces this: "The most successful implementations use simple, composable patterns rather than complex frameworks." The basic building block is an LLM enhanced with retrieval, tools, and memory — but critically, with the model generating its own search queries rather than receiving pre-retrieved context.

Four specific objections drove the RAG abandonment decision. **Security**: an index stored somewhere is a target; Cursor's path masking adds cryptographic complexity that Claude Code avoids entirely. **Privacy**: embeddings of proprietary code leak information even as dense vectors; research on embedding inversion has shown partial text recovery in some settings. **Staleness**: an index built at session start is stale as soon as the first file changes. **Reliability**: every additional system is a failure point; vector DBs have latency spikes, embedding APIs have rate limits, sync pipelines have bugs.

---

## The Real Costs: Token Burn and the Semantic Miss

The strongest published critique of agentic search came from [Milvus](https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md). Their argument: "Grep is a dead end that drowns you in irrelevant matches, burns tokens, and stalls your workflow. Without semantic understanding, it's like asking your AI to debug blindfolded." They propose their Claude Context vector MCP plugin as a hybrid fix, claiming 40% token reduction.

Milvus sells a vector database. That commercial interest is transparent and worth noting. It does not make the technical criticism wrong.

The token burn problem is real on common terms. Search `useState` across a React codebase and you will get hundreds of matches across dozens of files. Claude Code must either process all of them (expensive) or refine the query (adds turns). On codebases with inconsistent naming or high churn, the refinement loop can consume substantial context before reaching the target file.

The 200K token pricing cliff makes this worse when hit: any request exceeding 200K input tokens pays 2x on all tokens in that request, not just the excess. The jump from $3/million to $6/million is a hard threshold, not a gradual escalation — and agentic sessions on large codebases with vague prompts can hit it faster than expected.

The semantic miss problem is the other genuine limitation. Grep finds what you name. If `createD1HttpClient` was renamed `buildGatewayClient` six months ago, grep finds nothing. Vector embeddings preserve semantic relationships across renames — a real advantage on codebases with heavy refactoring history or cryptic abbreviation conventions.

In practice, Claude Code compensates by running multiple searches: "auth", "session", "token", "middleware", "jwt", "bearer" — triangulating toward the module rather than naming it directly. This multi-step reasoning is something static embedding retrieval cannot do (a vector DB returns its top-k hits and stops). But it costs more turns and more tokens than a single well-placed semantic query would.

Where agentic search wins clearly:
- **Exact symbol lookup** — function names, class names, import paths are precise by definition
- **Active editing sessions** — grep reads current filesystem state; no index can be as fresh
- **Security and privacy contexts** — zero data leaves the machine
- **Well-named, medium-sized codebases** — consistent naming discipline eliminates most semantic miss risk

Where proactive indexing wins:
- **Large monorepos** — millions of lines where iterative grep exploration burns context faster than it narrows
- **Conceptual search** — "find all places we handle authentication" without knowing exact symbol names
- **Unfamiliar codebases** — when you cannot yet name what you are looking for, semantic similarity is more useful than exact match
- **Enterprise teams** — persistent cross-session context without re-exploration cost

> **Q: Is agentic search better than RAG for code?**
> **A:** For many workloads, yes. A February 2026 Amazon Science paper (arXiv 2602.23368) found keyword search via agentic tool use achieves over 90% of RAG-level performance without a vector database. For code specifically, exact-match search outperforms semantic retrieval on stable, well-named codebases because code symbols are precise. RAG's advantage is on conceptual search across large repos with inconsistent naming.

---

## What Developers Built to Fill the Gap

The community response to Claude Code's no-index architecture is itself a data point. Developers who needed semantic search on top of agentic search built it as an MCP extension rather than switching tools.

Several projects emerged:
- **[Claude Context](https://github.com/zilliztech/claude-context)** (Milvus/Zilliz) — an MCP server adding vector-powered semantic search to Claude Code's tool set; the same Milvus that wrote the critique built the fix
- **[claude-codebase-indexer](https://github.com/evanrianto/claude-codebase-indexer)** — vector-based search with intelligent chunking as a Claude Code add-on
- **[claude-code-project-index](https://github.com/ericbuess/claude-code-project-index)** — a PROJECT_INDEX system for persistent architectural awareness across sessions
- **[CocoIndex](https://cocoindex.io/examples/code_index)** — real-time codebase indexing designed to work alongside any AI coding agent
- **[ast-grep](https://ast-grep.github.io)** — structural search understanding code ASTs, not raw text; finds patterns like "all arrow functions returning a Promise" without exact symbol names

The architectural significance: Claude Code is simultaneously an MCP client (connecting to external tool servers like these) and an MCP server (exposing its own file editing and command execution tools to Claude Desktop, Cursor, and Windsurf). The [MCP documentation](https://code.claude.com/docs/en/mcp) describes both directions. The no-index architecture is not a closed position — it is a composable default. Vector search is a plugin away for anyone who needs it.

The community's response tells us who the current architecture serves well (developers on medium-to-large codebases with disciplined naming who need precision and privacy) and who it does not fully serve out of the box (teams working on large legacy systems with inconsistent conventions where conceptual search across sessions would save significant time).

---

## Where This Is Going

Context windows keep expanding. Claude Sonnet 4.6 supports 1M tokens in beta. At that scale, the distinction between "indexing" and "just loading everything" starts to blur — a sufficiently large context window could theoretically hold a medium-sized codebase in its entirety.

There is a catch. [NxCode's analysis of Opus 4.6 at 1M tokens](https://www.nxcode.io/resources/claude-1m-token-context-codebase-analysis-guide-2026) documents a 17-point MRCR retrieval accuracy drop as context fills (93% at shorter contexts, 76% at 1M tokens). Large context is available but not free of quality degradation — models lose precision at the edges of their effective attention range. Loading an entire codebase into a context window does not guarantee the model uses that context accurately.

Three trajectories are running in parallel:

**Agentic search improves its execution.** Relace's parallel tool call result — 4x latency reduction by calling 4–12 tools simultaneously via RL-trained optimization — shows the sequential bottleneck can be engineered away. The fundamental approach stays the same; the execution gets more efficient. Expect Claude Code's own tool execution to move in this direction.

**Hybrid architectures become the production consensus.** The HN community thread on [agentic vs. RAG in production](https://news.ycombinator.com/item?id=47134263) reflects what practitioners are reaching for at enterprise scale: vector prefiltering to narrow candidates, followed by agentic confirmation. Faster first-query response from embeddings, precision and freshness from grep-based verification. Neither architecture alone is the final answer for the largest systems.

**Context window economics change the calculus.** With 1M token contexts and Anthropic's 81% cost reduction from prefix caching, the "loading an entire codebase is prohibitively expensive" constraint is weakening. Anthropic's principle — "just in time retrieval of the smallest possible set of high-signal tokens" — remains the right engineering philosophy, but the practical threshold for "too large to load" keeps rising.

What is not changing is Cherny's underlying bet. Claude Code is [described by its creator as "a Unix utility, not a product"](https://www.latent.space/p/claude-code). The design principle is "do the simple thing first": memory is a markdown file, prompt summarization is done simply, search is grep. Complexity is deferred until it is demonstrated to be necessary. The RAG experiment demonstrated it was not — at least not for the majority of workloads.

The one scenario where indexing becomes necessary is the scenario that is genuinely hard to grep: a monorepo at Google or Meta scale, with millions of files, multiple programming languages, decades of naming inconsistency, and teams who need to ask conceptual questions about code they have never read. That is a real workload. It is not the workload Claude Code was designed for.

For the rest — developers working on their own codebases, on team projects with shared naming conventions, on repositories they understand well enough to name what they are looking for — the agentic search approach holds. Grep is precise, fresh, and private. The model learns to search the way you would, because it has the same tools you do. And as 1M-token context windows become the baseline, the gap between "search" and "load everything" shrinks further — which means the principle Anthropic bet on (retrieve just in time, keep context tight, prefer simplicity) only becomes more relevant as the underlying capability improves.

---

## References

**Primary sources**
- [Boris Cherny on X — RAG abandoned quote](https://x.com/bcherny/status/2017824286489383315)
- [Hacker News thread — Claude engineer confirmation (item 43164253)](https://news.ycombinator.com/item?id=43164253)
- [Inside Claude Code with Boris Cherny — YC Startup Library](https://www.ycombinator.com/library/NJ-inside-claude-code-with-its-creator-boris-cherny)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) (Dec 2024)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (Sep 2025)
- [Claude Code official documentation](https://code.claude.com/docs/en/overview)
- [Claude Code: costs](https://code.claude.com/docs/en/costs)
- [Claude Code on Latent Space Podcast](https://www.latent.space/p/claude-code)

**Architecture and reverse engineering**
- [BrightCoding — Inside Claude Code: Deep-Dive Reverse Engineering Report](https://www.blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/)
- [Piebald-AI/claude-code-system-prompts (GitHub)](https://github.com/Piebald-AI/claude-code-system-prompts)
- [LMCache — Context Engineering & Reuse Pattern Under the Hood of Claude Code](https://blog.lmcache.ai/en/2025/12/23/context-engineering-reuse-pattern-under-the-hood-of-claude-code/) (Dec 2025)
- [George Sung — Tracing Claude Code's LLM Traffic](https://medium.com/@georgesung/tracing-claude-codes-llm-traffic-agentic-loop-sub-agents-tool-use-prompts-7796941806f5) (Jan 2026)
- [Kir Shatrov — Reverse engineering Claude Code](https://kirshatrov.com/posts/claude-code-internals)

**Competitor architecture**
- [How Cursor Indexes Codebases Fast — Engineers Codex](https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast)
- [Cursor Secure Codebase Indexing](https://cursor.com/blog/secure-codebase-indexing)
- [Windsurf Remote Indexing Docs](https://docs.windsurf.com/context-awareness/remote-indexing)
- [GitHub Copilot Semantic Search GA — GitHub Changelog](https://github.blog/changelog/2025-03-12-instant-semantic-code-search-indexing-now-generally-available-for-github-copilot/) (Mar 2025)

**Performance and benchmarks**
- [Relace — Exploiting Parallel Tool Calls to Make Agentic Search 4x Faster](https://relace.ai/blog/fast-agentic-search)
- [Milvus — Why I'm Against Claude Code's Grep-Only Retrieval](https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md)
- [arXiv 2602.23368 — Keyword Search Is All You Need](https://arxiv.org/abs/2602.23368) (Feb 2026)
- [NxCode — Claude Opus 4.6 at 1M Token Context](https://www.nxcode.io/resources/claude-1m-token-context-codebase-analysis-guide-2026)

**Community tools**
- [Claude Context MCP (Zilliz)](https://github.com/zilliztech/claude-context)
- [claude-codebase-indexer](https://github.com/evanrianto/claude-codebase-indexer)
- [claude-code-project-index](https://github.com/ericbuess/claude-code-project-index)
- [CocoIndex real-time codebase indexing](https://cocoindex.io/examples/code_index)
- [ast-grep structural search](https://ast-grep.github.io)
