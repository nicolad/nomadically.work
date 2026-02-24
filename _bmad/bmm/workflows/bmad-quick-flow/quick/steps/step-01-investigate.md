---
name: 'step-01-investigate'
description: 'Deep investigation of the task, then ask ONE round of clarifying questions'

nextStepFile: './step-02-execute.md'
---

# Step 1: Investigate + Ask Once

**Goal:** Understand the task deeply by reading actual code, then ask ALL clarifying questions in a single message. This is the ONLY time you ask the user anything.

**Critical rule:** Do NOT ask questions before investigating. Questions must be informed by what you find in the code.

---

## STATE VARIABLES (capture now, persist throughout)

- `{baseline_commit}` - Git HEAD at workflow start (or "NO_GIT" if not a git repo)
- `{task_description}` - The user's original request
- `{files_to_modify}` - List of files identified during investigation
- `{implementation_plan}` - Ordered list of tasks

---

## EXECUTION SEQUENCE

### 1. Capture Baseline

Check if the project uses Git:

- **Git repo:** Run `git rev-parse HEAD` → store as `{baseline_commit}`
- **No Git:** Set `{baseline_commit}` = "NO_GIT"

### 2. Load Project Context

Check if `{project_context}` exists (`**/project-context.md`). If found, load it. Skim for conventions, patterns, and constraints relevant to this task.

### 3. Parse Task Description

Read the user's request carefully. Extract:
- What needs to change
- Which feature/domain is affected
- Any explicit file hints or constraints the user mentioned

### 4. Deep Investigation

**Do this BEFORE forming questions.** Search and read:

a) **Find the relevant files:**
   - Use glob/grep to locate files matching the task domain
   - Read the top-level structure of each relevant file (don't just skim — read enough to understand patterns)

b) **Understand current behavior:**
   - What does the existing code do today?
   - What patterns does it use (naming, error handling, types, imports)?
   - Are there tests for this area?

c) **Identify the change surface:**
   - Which files need to change?
   - What new files (if any) are needed?
   - What dependencies or side-effects exist?
   - Are there schema files, generated types, or config that also need updating?

d) **Check for related artifacts:**
   - Check `{planning_artifacts}` and `{implementation_artifacts}` for any PRD, architecture doc, or story related to this task
   - Check for any existing tech-spec or story for this feature

e) **Note all ambiguities** — things you cannot safely assume that require a user decision

### 5. Form the Single Question Round

Now — and ONLY now — compile ALL your questions into one message.

**Format:**

```
Hey {user_name}! I've investigated the codebase. Here's what I found and what I need from you before I start:

**What I found:**
- {key finding 1}
- {key finding 2}
- ...

**My plan:**
1. {task 1} — {file or component}
2. {task 2} — {file or component}
...

**I need answers to these before I start (answer all at once):**
Q1. {specific question informed by code investigation}
Q2. {specific question informed by code investigation}
...

Once you answer, I'll implement everything without interrupting you again.
```

**Question quality rules:**
- Questions MUST reference specific code you found (file names, function names, patterns)
- No generic questions ("What's the scope?" → banned)
- Maximum 5 questions — if you have more, make assumptions on the less critical ones and state your assumptions
- If you have zero questions (everything is clear from the code), skip the question round and state your plan, then say "Replying with 'go' will start implementation" — then wait for that single confirmation

**HALT here.** Wait for user's reply. This is the ONLY halt point in the entire workflow.

### 6. Parse User's Answers

When the user replies:

- Extract answers to each question
- Update your implementation plan based on the answers
- Store final `{files_to_modify}` and `{implementation_plan}`
- Do NOT ask follow-up questions — make reasonable assumptions on anything still unclear and note them

### 7. Announce and Proceed

State briefly:

```
Got it. Starting implementation now. I'll only interrupt if I hit a true blocker.

**Plan:**
- [ ] Task 1
- [ ] Task 2
...
```

Then immediately read fully and follow: `{project-root}/_bmad/bmm/workflows/bmad-quick-flow/quick/steps/step-02-execute.md`

---

## SUCCESS METRICS

- `{baseline_commit}` captured
- Relevant code actually read (not just searched for filenames)
- All questions informed by specific code findings
- Single question round completed (no follow-up questions)
- `{implementation_plan}` finalized before proceeding

## FAILURE MODES

- Asking questions without investigating first
- Asking generic, non-code-informed questions
- Asking more than one round of questions
- Asking follow-up questions after user replies
- Proceeding without a finalized implementation plan
