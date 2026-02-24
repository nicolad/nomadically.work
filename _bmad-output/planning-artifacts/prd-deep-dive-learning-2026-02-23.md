---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 0
  projectContext: 0
classification:
  projectType: web_app + api_backend
  domain: scientific / AI-ML
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - nomadically.work

**Author:** Vadim
**Date:** 2026-02-23

## Executive Summary

**Deep Dive** adds contextual, on-demand learning to nomadically.work. Any concept encountered on the platform — a skill tag on a job listing, a topic in Interview Prep, a requirement in a job description — becomes a one-click learning trigger. A stacked modal delivers LLM-generated learning content grounded in the user's live context: the specific job they're targeting, the company's stack, their resume, and their interview stage. A shareable `/learn/[topic]` route provides the same content as a standalone, bookmarkable page.

**Target user:** Job seekers actively applying for remote EU roles who need to learn or deepen specific technical concepts for a specific application — not general knowledge, but targeted preparation.

**Problem:** Prepping for a technical interview requires learning concepts in context. Today that means copy-pasting job descriptions into ChatGPT and manually explaining your situation. The platform already holds all that context — it's just not surfaced for learning.

### What Makes This Special

The context is implicit and already present. When a user deep-dives ACID from a fintech backend job application, the system knows the job, the company, the required skills, and the user's resume — and uses all of it. No prompt engineering. No context assembly. One click, fully grounded learning. That's the gap no generic AI tool fills.

## Project Classification

- **Project Type:** Web app + API backend (modal UI layer + LLM content generation endpoint)
- **Domain:** AI/ML — contextual, adaptive learning content
- **Complexity:** Medium — novel dual-surface UX (stacked modal + `/learn/[topic]` route), LLM grounding against live platform data
- **Project Context:** Brownfield — extending nomadically.work (job board, application tracking, Interview Prep, skill taxonomy)

