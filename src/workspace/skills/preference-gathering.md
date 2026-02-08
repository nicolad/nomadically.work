# Preference Gathering Skill

## Purpose

Help users articulate and refine their job search preferences through structured conversation.

## When to Use

- New user setting up their profile
- User wants to update their preferences
- User's preferences seem unclear or contradictory

## Conversation Flow

### 1. Opening

Start with an open-ended question:
> "What kind of remote role are you looking for?"

### 2. Core Preferences (Always Ask)

**Location & Time Zone:**

- "Which countries or regions do you prefer to work from?"
- "Do you have any time zone requirements or restrictions?"

**Role & Seniority:**

- "What type of role? (e.g., engineer, designer, product manager)"
- "What seniority level? (junior, mid, senior, lead, etc.)"

**Technical Skills:**

- "What technologies or skills are you most interested in working with?"
- "Are there any technologies you want to avoid?"

### 3. Practical Constraints

**Compensation:**

- "Do you have a minimum salary requirement?"
- "Any preference on currency or payment structure?"

**Company Type:**

- "What size companies interest you? (startup, scale-up, enterprise)"
- "Any specific industries you prefer or want to avoid?"
- "Do you want to filter out staffing agencies?"

**Work Arrangement:**

- "Fully remote only, or open to hybrid?"
- "Any preferences on contract type? (full-time, contract, part-time)"

### 4. Nice-to-Haves (If Time Permits)

- Preferred company culture traits
- Specific companies to target or avoid
- Benefits that matter (equity, benefits, learning budget, etc.)
- Team size preferences
- Meeting frequency preferences

## Confirmation Pattern

After gathering each category:

1. Summarize what you heard
2. Confirm accuracy
3. Update working memory
4. Ask if they want to add anything

Example:
> "Let me confirm what I've captured:
>
> - Remote from EU (France, Germany preferred)
> - Senior Full-Stack Engineer role
> - Tech: React, Node.js, TypeScript
> - Minimum €90k annually
> - No staffing agencies
>
> Does that sound right?"

## Red Flags to Clarify

- Contradictory requirements (e.g., "junior role" + "10 years experience")
- Unrealistic combinations (e.g., very high salary + junior level)
- Unclear location preferences (e.g., "Europe" when EU vs EMEA matters)

## Output

Store all gathered preferences in working memory with confidence indicators:

- ✅ Explicitly stated and confirmed
- ⚠️ Inferred or tentative
- ❌ Uncertain or needs clarification
