---
name: 'step-03-done'
description: 'Wrap up — summarize what was done, list assumptions, note any follow-ups'
---

# Step 3: Done

**Goal:** Give the user a clean summary of what was shipped.

---

## EXECUTION SEQUENCE

### 1. List Completed Work

```
**Done.** Here's what I implemented:

- [x] {task 1} — {brief note on what changed}
- [x] {task 2} — {brief note on what changed}
...
```

### 2. Report Assumptions (if any)

If any `[ASSUMED]` entries were logged during execution:

```
**Assumptions made:**
- {assumption} — {rationale}
```

### 3. Note Follow-ups (if any)

Only include items that genuinely require user action (not suggestions or improvements):

```
**You need to:**
- {action} — {why}
```

Examples of genuine follow-ups:
- Run `pnpm db:push` to apply a migration to remote D1
- Add an env var `FOO_KEY` — not in `.env.example`
- Deploy a Cloudflare worker that was updated

### 4. Diff Summary

Report the baseline commit and what changed:

```
**Changes from {baseline_commit}:**
- {N} files modified
- {list files}
```

---

## SUCCESS METRICS

- All completed tasks listed
- All assumptions surfaced
- Only genuine follow-ups included (no suggestions)
- Diff summary provided

## FAILURE MODES

- Padding the summary with unnecessary commentary
- Omitting assumptions that were made
- Listing optional suggestions as required follow-ups
