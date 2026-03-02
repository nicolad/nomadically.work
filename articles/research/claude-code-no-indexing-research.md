# Research Brief: Why Claude Code Doesn't Use Codebase Indexing

**Slug:** claude-code-no-indexing
**Topic:** Claude Code's deliberate choice to avoid RAG/indexing in favor of agentic search
**Target audience:** Developers curious about how AI coding tools work under the hood
**Tone:** Technical but accessible, slightly opinionated, honest about tradeoffs
**Length:** 800–1200 words

---

## Core Concept: "Agentic Search"

Claude Code deliberately avoids codebase indexing or RAG (Retrieval-Augmented Generation) with vector embeddings. Instead it uses on-the-fly, tool-driven exploration called "agentic search."

When given a task, Claude works through three phases that blend together:
1. **Gather context** — search files to understand the code
2. **Take action** — edit files, run commands
3. **Verify results** — check tests, inspect output

Anthropic found this more effective and flexible than full codebase indexing.

---

## The Core Built-in Tools

| Tool | What it does | Cost |
|---|---|---|
| **Glob** | Fast file pattern matching (`**/*.js`, `src/**/*.ts`), returns paths sorted by modification time | Lightweight |
| **Grep** | Regex content search across files | Lightweight |
| **Read** | Load specific file contents | Heavy — consumes context |
| **Task/Explore agents** | Use separate context windows (Haiku model) | Preserves main conversation context |

Glob and Grep are lightweight — they return file paths or matched lines without loading entire files. Read loads file contents (necessary but expensive). Sub-agents preserve the main context window.

---

## Sub-Agents for Exploration

The Explore agent is a read-only specialist: Glob, Grep, Read, and limited Bash (copy, move, list files only). Strictly prohibited from creating or modifying files. Uses the Haiku model to be lightweight and cheap.

---

## The Agentic Loop

Claude decides what each step requires based on what it learned from the previous step — chaining dozens of actions, course-correcting along the way. The user can interrupt at any point to steer direction, provide additional context, or pivot approach.

---

## Why Not Indexing? — The Key Argument

**Source:** A Claude engineer openly admitted on Hacker News that Claude Code doesn't use RAG at all. Instead it greps the repo line by line using "agentic search" — no semantics, no structure, just raw string matching.

The Claude Code team initially experimented with RAG using embeddings but found that giving the agent filesystem tools to explore code naturally delivered **significantly better results**.

**Core argument for this approach:**
> Grep is fast, exact, and predictable — and with programming, precision matters more than fuzzy semantic similarity.

When you search for `createD1HttpClient`, you want *exactly* that function — not "something similar to database client creation." Fuzzy retrieval introduces false positives that can mislead the model.

---

## Tradeoffs and Community Response

**Criticism:**
- Token consumption — grep drowns you in irrelevant matches, burns tokens, stalls workflow
- No semantic understanding — can miss conceptually related code that uses different naming
- Large repos can be expensive to explore

**Community-built alternatives:**
- **Claude Context** — vector-powered MCP plugin for semantic search
- **GrepAI** — semantic search CLI
- **ast-grep** — structural AST-based search (understands code structure, not just strings)

---

## Relevant URLs / Sources
- How Claude Code Works: https://code.claude.com/docs/en/how-claude-code-works
- Claude Code FAQ: https://support.claude.com/en/articles/12386420-claude-code-faq
- Claude Code Docs Map: https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md
- Hacker News thread (Claude engineer admission about no RAG)
