# Claude Code Doesn't Index Your Codebase. Here's What It Does Instead.

A Claude engineer said it plainly on Hacker News: Claude Code doesn't use RAG. No vector database, no embeddings, no pre-built index. When you ask it to find where a function is defined, it greps your repository line by line — the same way you would in a terminal, except it chains dozens of those searches together, corrects course, and keeps going until it has what it needs.

That admission came from Boris Cherny, one of the engineers who built Claude Code, in a public Hacker News thread. It is the clearest primary source on why Anthropic made this architectural choice, and it sits behind most of the articles written on the topic — usually cited loosely and rarely linked directly. The reasoning is worth taking seriously on its own terms.

---

## The Confession: Claude Code's Creator Said It Plainly on Hacker News

No. Claude Code does not pre-index your codebase or use vector embeddings. Instead, it uses a set of filesystem tools — Glob for file pattern matching, Grep for content search, and Read for loading specific files — to explore code on demand as it works through each task. Anthropic calls this ["agentic search"](https://code.claude.com/docs/en/how-claude-code-works).

Boris Cherny confirmed that early versions of Claude Code did experiment with RAG and a local vector database. The team abandoned it. Agentic search — letting the model decide what to look at, when, using exact-match tools — consistently outperformed the embedding-based approach, and that result drove the architecture that ships today.

The Hacker News thread is worth reading in full. Cherny's directness about the tradeoffs is unusual for an engineer at a major AI company discussing an active product decision. It signals that the choice was deliberate, not an oversight waiting to be fixed in a future release.

---

## What Agentic Search Actually Means (and the Tools Behind It)

"Agentic" means the model drives the search process itself rather than receiving pre-retrieved context. Claude Code decides what to look for, chooses the right tool, acts on the results, and decides what to look for next — looping until it has enough context to complete the task.

The tool hierarchy matters because the tools have very different costs:

| Tool | What it does | Cost |
|---|---|---|
| **Glob** | Pattern matching across file paths (`**/*.ts`, `src/**/*.graphql`) | Lightweight — returns paths only |
| **Grep** | Regex content search across file contents | Lightweight — returns matching lines |
| **Read** | Loads full file contents into context | Heavy — consumes context window |
| **Task / Explore agents** | Spawns a read-only sub-agent with its own context window | Preserves main conversation context |

Full tool reference: [Claude Code documentation](https://code.claude.com/docs/en/how-claude-code-works)

### Glob: The Cheap First Pass

Glob is Claude Code's opening move. Matching `workers/**/*.toml` to find all Cloudflare Worker configs costs almost nothing — it returns file paths, not file contents. Claude Code uses Glob to narrow the search space before touching anything expensive.

### Grep: Pattern Matching at Scale

Grep does the heavier lifting: searching file contents for a regex pattern. Running `grep -r "createD1HttpClient" .` across a codebase returns every line containing that string. It is fast, exact, and composable. Claude Code chains Grep calls the way a developer would run searches in sequence, each one informed by the previous result.

### Read: The Expensive One

Read loads the full contents of a file into the context window. It is necessary — you cannot edit a file you have not read — but it is the most context-expensive operation. Claude Code reserves Read for files it has already identified as relevant through Glob and Grep, treating it as a confirm step rather than a discovery tool.

### Explore Agents: Preserving Your Main Context Window

For deeper investigation, Claude Code spawns an Explore sub-agent: a read-only specialist running on the Haiku model with its own isolated context window. The Explore agent can Glob, Grep, Read, and run limited Bash commands (list, copy, move) but cannot create or modify files. This keeps heavy exploration work from consuming the main conversation's context — which matters on long sessions across large codebases.

---

## Why Anthropic Chose Grep Over Embeddings

Claude Code's creator, Boris Cherny, explained on Hacker News that early versions used RAG with a local vector database, but the team found agentic search consistently outperformed it. The main reasons: precision (grep finds exact matches, embeddings introduce fuzzy positives), simplicity, and no staleness problem (a pre-built index drifts from the actual code).

The precision argument is the most important one. If you search for `createD1HttpClient`, you want exactly that function — not "something semantically related to database client initialization." Fuzzy retrieval with vector embeddings surfaces conceptually adjacent code that shares no tokens with your actual target. That introduces noise the model must reason through, often incorrectly.

With grep, there are no false positives on exact symbol names. `createD1HttpClient` either appears in a file or it does not. The model gets a clean, deterministic result and can act on it immediately.

There is also a staleness problem with pre-built indexes. A vector index built at session start reflects the codebase at that moment. If you edit files mid-session — which is exactly what an AI coding agent does constantly — the index is stale before the next query. Agentic search has no staleness because it reads the current state of the filesystem on each tool call.

---

## The Real Tradeoffs: When Grep Wins and When It Doesn't

The case against grep-only retrieval is real, and the Milvus blog made it explicitly. Milvus sells a vector database, so their interest in the outcome is transparent — but the technical criticism holds up independently.

### The Token Cost Problem

Grep can be noisy. Search for a common variable name like `data` or `result` across a large TypeScript repository and you will get hundreds of matches, many irrelevant. Claude Code must either scan all of them (expensive) or refine the search (adds steps). On very large repositories, iterative exploration can burn a significant portion of a context window before the model reaches the file it actually needs.

This is a real cost. Context windows are not infinite, and every token spent on irrelevant grep matches is a token not available for the task.

### The Semantic Miss Problem

Grep finds what you name. If you search for `createD1HttpClient` and the function was renamed `buildGatewayClient` six months ago, grep finds nothing. Vector embeddings would likely surface the renamed function because the semantic relationship between the two concepts is preserved in the embedding space.

For codebases with inconsistent naming conventions or significant refactoring history, the semantic miss rate for grep-based search can be meaningful. The Anthropic team found that agentic search outperformed RAG in their evaluations — but those evaluations were not published, and the specific benchmark conditions matter. A codebase with stable, descriptive naming is not the same workload as one with cryptic abbreviations and heavy historical churn.

---

## What the Community Built to Fill the Gap

Developers took the tradeoff seriously and built workarounds:

- **[Claude Context](https://github.com/nicholasgasior/claude-context)** — an MCP plugin that adds vector-powered semantic search to Claude Code's tool set, giving it the fuzzy retrieval capability it deliberately lacks
- **[GrepAI](https://grepai.dev)** — a semantic search CLI that wraps grep-style queries with embedding-based ranking, letting you get exact-match results ranked by conceptual relevance
- **[ast-grep](https://ast-grep.github.io)** — structural search that understands code ASTs rather than raw text; finds patterns like "all arrow functions that return a Promise" without needing to know the exact function names

These tools treat agentic search as a floor, not a ceiling. They add semantic and structural layers on top of Claude Code's exact-match foundation rather than replacing it. That is the right frame: grep is not wrong, it is incomplete for some workloads.

---

## The Bottom Line: Precision by Design

Claude Code's decision to skip indexing is not a gap in the roadmap. It is the conclusion the Anthropic team reached after running the experiment: agentic search with exact-match tools outperformed RAG in their evaluations, and the simplicity and freshness benefits reinforced that result.

The real costs are token consumption on noisy searches and semantic misses on renamed symbols. Those are genuine limitations, not marketing spin from a competing vendor. Whether they matter depends on your codebase size, naming discipline, and tolerance for context burn.

For most developers working on reasonably sized, well-named codebases, the agentic search approach works well. For teams on multi-million-line monorepos or repos with significant naming inconsistency, the community-built semantic layers — Claude Context MCP, ast-grep — are worth evaluating as supplements.

The underlying principle is defensible: when you are working with code, precision beats fuzzy similarity. Grep finds what you name. That is a feature, not a limitation — until it is not.

---

**References**
- [How Claude Code works — Anthropic docs](https://code.claude.com/docs/en/how-claude-code-works)
- [Claude Code FAQ — Anthropic support](https://support.claude.com/en/articles/12386420-claude-code-faq)
- Boris Cherny on Hacker News (primary source — search "Claude Code RAG HN")
