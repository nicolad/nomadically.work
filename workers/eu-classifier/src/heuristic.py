"""Tier 0: Deterministic keyword heuristic for EU remote classification.

Returns high-confidence results for unambiguous cases.
Returns None for anything ambiguous, signalling escalation to the LLM tier.
"""

import re

from constants import normalize_text_for_signals
from models import JobClassification


def keyword_eu_classify(job: dict, signals: dict) -> JobClassification | None:
    """Tier 0: deterministic EU classification heuristic.

    Returns high-confidence results only for unambiguous cases.
    Returns None for anything ambiguous -> falls through to LLM.
    """
    location = (job.get("location") or "").lower()

    # Negative signals -> reject
    if signals["negative_signals"]:
        return JobClassification(
            isRemoteEU=False,
            confidence="high",
            reason=f"Heuristic: negative signals found: {', '.join(signals['negative_signals'][:3])}",
        )

    # ATS says not remote and location is not remote -> reject
    if not signals["ats_remote"] and "remote" not in location:
        desc_lower = (job.get("description") or "").lower()
        if ("on-site" in desc_lower or "onsite" in desc_lower or "hybrid" in location
                or "in office" in desc_lower):
            return JobClassification(
                isRemoteEU=False,
                confidence="high",
                reason="Heuristic: not a remote position",
            )

    # EU country code + remote flag -> accept
    if signals["eu_country_code"] and signals["ats_remote"]:
        return JobClassification(
            isRemoteEU=True,
            confidence="high",
            reason=f"Heuristic: EU country code ({signals['country_code']}) + ATS remote flag",
        )

    # Explicit "Remote - EU" / "Remote | EU" in location
    if re.search(r"\bremote\b.*\beu\b(?!\s*timezone)", location, re.IGNORECASE):
        return JobClassification(
            isRemoteEU=True,
            confidence="high",
            reason="Heuristic: explicit 'Remote EU' in location",
        )

    # EU country in location + remote -> accept
    if signals["eu_countries_in_location"] and signals["ats_remote"]:
        countries = ", ".join(signals["eu_countries_in_location"][:3])
        return JobClassification(
            isRemoteEU=True,
            confidence="high",
            reason=f"Heuristic: EU/EEA country in location ({countries}) + ATS remote flag",
        )

    # US-implicit signals + no EU signals -> escalate to LLM
    if (signals.get("us_implicit_signals")
            and not signals["eu_country_code"]
            and not signals["eu_timezone"]
            and not signals["eu_countries_in_location"]):
        return None

    # Worldwide remote: ATS remote flag + no country code + no negative signals.
    # Require a meaningful description and a plausible company key (not a raw
    # ATS board token filled with digits) before auto-accepting.
    if signals["ats_remote"] and not signals["country_code"]:
        company_key = (job.get("company_key") or "")
        digit_ratio = (
            sum(1 for c in company_key if c.isdigit()) / len(company_key)
            if company_key else 0.0
        )
        if digit_ratio > 0.4:
            # Suspicious board token — escalate to LLM rather than auto-accept
            return None
        desc_len = len((job.get("description") or "").strip())
        if desc_len < 100:
            # Near-empty description — not enough signal to auto-accept
            return None
        return JobClassification(
            isRemoteEU=True,
            confidence="medium",
            reason="Heuristic: worldwide remote (ATS remote flag, no country restriction)",
        )

    # Non-EU country but ATS remote + description signals worldwide/global scope
    desc_lower = normalize_text_for_signals((job.get("description") or "").lower())
    if signals["ats_remote"] and signals["country_code"] and not signals["eu_country_code"]:
        # Tier A: Explicit "work from anywhere" phrases -> auto-accept
        _explicit_worldwide_pattern = re.compile(
            r"\b(anywhere in the world|work from anywhere"
            r"|location.agnostic|digital nomad)\b",
            re.IGNORECASE,
        )
        explicit_match = _explicit_worldwide_pattern.search(desc_lower)
        if explicit_match:
            return JobClassification(
                isRemoteEU=True,
                confidence="medium",
                reason=f"Heuristic: non-EU HQ ({signals['country_code']}) but worldwide remote ({explicit_match.group(0)})",
            )

        # Tier B: Vague phrases -> escalate to LLM
        _vague_worldwide_pattern = re.compile(
            r"\b(global(?:ly)?|worldwide|distributed team|fully distributed"
            r"|remote.first|remote.friendly)\b",
            re.IGNORECASE,
        )
        vague_match = _vague_worldwide_pattern.search(desc_lower)
        if vague_match:
            return None

    # Check description for explicit EU eligibility even without ATS signals
    if signals["ats_remote"]:
        eu_desc_match = re.search(
            r"\b(eu\s+(?:based|eligible|residents?|citizens?|work\s*(?:authorization|permit))"
            r"|european\s+(?:union|economic\s+area)"
            r"|remote.*\beu\b"
            r"|emea)"
            r"\b",
            desc_lower if 'desc_lower' in dir() else (job.get("description") or "").lower(),
            re.IGNORECASE,
        )
        if eu_desc_match:
            return JobClassification(
                isRemoteEU=True,
                confidence="medium",
                reason=f"Heuristic: EU signal in description ({eu_desc_match.group(0)})",
            )

    return None  # Ambiguous -- escalate to LLM
