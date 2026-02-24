"""LangChain prompt templates for EU remote classification."""

from langchain_core.prompts import ChatPromptTemplate

# Phase 3 -- EU Remote Classification
CLASSIFICATION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert at classifying job postings for Remote EU eligibility. "
        "A Remote EU position must be FULLY REMOTE and allow work from EU member countries. "
        "Return structured JSON output with clear reasoning.",
    ),
    (
        "human",
        """Classify this job posting as Remote EU or not.

JOB DETAILS:
- Title: {title}
- Location: {location}
- Description: {description}

STRUCTURED SIGNALS (from ATS metadata -- trust these over raw text):
{structured_signals}

CLASSIFICATION RULES (apply in order):

0. NEGATIVE SIGNALS (highest priority -- override all other rules):
   - "US only", "must be based in US", "US work authorization required" -> isRemoteEU: false (high confidence)
   - "No EU applicants", "cannot accept from EU" -> isRemoteEU: false (high confidence)
   - Swiss-only work permit in DACH context -> isRemoteEU: false (high confidence)
   - These override worldwide/EMEA/EU timezone when present

1. FULLY REMOTE REQUIREMENT: Must explicitly state "remote", "fully remote", or similar.
   - Hybrid, office-based, or on-site positions -> isRemoteEU: false
   - "Remote support" (providing remote support from an office) is NOT remote work

2. ATS METADATA SHORTCUTS (when available):
   - EU country code + ATS remote flag -> isRemoteEU: true (high confidence)
   - ATS workplace_type = "not remote" -> isRemoteEU: false (high confidence)

3. EXPLICIT EU MENTIONS: Look for clear EU indicators:
   - "Remote - EU", "EU only", "EU members only" -> isRemoteEU: true (high confidence)
   - Specific EU countries only (e.g., "Germany, France, Spain") -> isRemoteEU: true

4. WORK AUTHORIZATION: Strong signal for EU remote:
   - "EU work authorization", "EU passport", "EU residency" -> isRemoteEU: true

5. REGIONAL SHORTHANDS:
   - "DACH" (Germany, Austria, Switzerland) -> isRemoteEU: true (medium confidence -- 2 of 3 are EU)
   - "Nordics" (Sweden, Finland, Denmark + Norway, Iceland) -> isRemoteEU: true (medium confidence -- 3 of 5 are EU)
   - "Benelux" (Belgium, Netherlands, Luxembourg) -> isRemoteEU: true (high confidence -- all EU)
   - "CEE" / "Central & Eastern Europe" -> isRemoteEU: true (medium confidence -- mostly EU)

6. BROADER REGIONS (EU workers are generally eligible):
   - "EMEA" + EU work auth -> isRemoteEU: true (high confidence)
   - "EMEA" alone -> isRemoteEU: true (medium confidence)
   - "Europe" without EU specification -> isRemoteEU: true (medium confidence)
   - "EU + UK + Switzerland" (mixed) -> isRemoteEU: true (medium confidence)

7. TIMEZONE SIGNALS:
   - "EU Timezone" -> isRemoteEU: true (medium confidence)
   - "CET +/- N hours", "European business hours" -> isRemoteEU: true (medium confidence)
   - "CET timezone" alone (no EU context) -> isRemoteEU: false (medium -- not exclusive to EU)

8. WORLDWIDE / GLOBAL:
   - Worldwide + negative signals (US only etc.) -> isRemoteEU: false (high confidence)
   - Worldwide + EU country/office in signals -> isRemoteEU: true (medium confidence)
   - Worldwide + no EU specifics -> isRemoteEU: true (LOW confidence -- downgraded)

9. SPECIFIC COUNTRIES/REGIONS:
   - UK only (post-Brexit) -> isRemoteEU: false
   - Switzerland only -> isRemoteEU: false

10. CONFIDENCE LEVELS:
   - HIGH: Explicit EU mention, clear remote status, work authorization required, all-EU region, negative signals
   - MEDIUM: Mixed regions (includes EU), EEA, Europe, EMEA, DACH, Nordics, EU timezone, CET+/-N
   - LOW: Too vague, worldwide with no EU specifics, preference (not requirement)

RESPOND ONLY WITH VALID JSON:
{{
  "isRemoteEU": true/false,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation referencing the classification rules applied"
}}""",
    ),
])
