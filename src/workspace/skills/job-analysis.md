# Job Analysis Skill

## Purpose

Analyze job postings to extract key information and determine relevance for remote EU workers.

## When to Use

- User asks about job requirements
- User needs help understanding if a job matches their profile
- User wants to compare multiple job opportunities

## Steps

### 1. Extract Core Information

- Job title and seniority level
- Location and remote work policy
- Salary range (if provided)
- Required skills and technologies
- Company information and industry

### 2. Evaluate Remote EU Compatibility

Check if the job:

- ✅ Explicitly states "Remote" or "Work from home"
- ✅ Allows work from EU countries
- ✅ Lists EU countries or "Europe" in location
- ⚠️ Mentions time zone requirements (CET/CEST compatible?)
- ❌ Requires office presence or is hybrid
- ❌ Only mentions non-EU locations

### 3. Technical Skills Assessment

For each required skill:

- Mark if it's "required" (must-have) vs "preferred" (nice-to-have)
- Note specific frameworks, tools, or versions mentioned
- Identify transferable skills from related technologies

### 4. Cultural and Practical Factors

Consider:

- Company size and stage
- Team structure
- Communication practices
- Work hours and time zone overlap
- Benefits and perks mentioned

## Output Format

**Job Title:** [title]
**Company:** [company name]
**Remote EU:** ✅ Yes / ⚠️ Maybe / ❌ No

**Key Requirements:**

- [requirement 1]
- [requirement 2]
...

**Technical Stack:**

- [tech 1] (required)
- [tech 2] (preferred)
...

**Notes:**
[Any additional observations or red flags]

## Example Query

"Can you analyze this job posting for me? [paste job description]"
