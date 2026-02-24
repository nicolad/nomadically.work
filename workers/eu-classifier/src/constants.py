"""EU classification constants — ISO codes, country mappings, regex patterns.

Single source of truth for all EU/EEA membership data and text-matching
patterns used by both the heuristic classifier and the LLM prompt.
"""

import re

# -------------------------------------------------------------------------
# EU member state + EEA ISO 3166-1 alpha-2 codes
# -------------------------------------------------------------------------

EU_ISO_CODES: frozenset[str] = frozenset({
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    # EEA (EU labour market access)
    "NO", "IS", "LI",
})

# EU + EEA country names (lowercase) for text matching
EU_COUNTRY_NAMES: frozenset[str] = frozenset({
    "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
    "czechia", "denmark", "estonia", "finland", "france", "germany", "greece",
    "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
    "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia",
    "spain", "sweden",
    # EEA
    "norway", "iceland", "liechtenstein",
})

# Country name -> ISO code mapping (covers common ATS values)
COUNTRY_NAME_TO_ISO: dict[str, str] = {
    "austria": "AT", "belgium": "BE", "bulgaria": "BG", "croatia": "HR",
    "cyprus": "CY", "czech republic": "CZ", "czechia": "CZ", "denmark": "DK",
    "estonia": "EE", "finland": "FI", "france": "FR", "germany": "DE",
    "greece": "GR", "hungary": "HU", "ireland": "IE", "italy": "IT",
    "latvia": "LV", "lithuania": "LT", "luxembourg": "LU", "malta": "MT",
    "netherlands": "NL", "poland": "PL", "portugal": "PT", "romania": "RO",
    "slovakia": "SK", "slovenia": "SI", "spain": "ES", "sweden": "SE",
    # EEA
    "norway": "NO", "iceland": "IS", "liechtenstein": "LI",
    # Non-EU (for correct negative classification)
    "united states": "US", "usa": "US", "u.s.a.": "US", "u.s.": "US",
    "united kingdom": "GB", "uk": "GB", "switzerland": "CH",
    "canada": "CA", "australia": "AU", "new zealand": "NZ",
    "japan": "JP", "singapore": "SG", "india": "IN", "brazil": "BR",
    "israel": "IL", "south korea": "KR", "china": "CN",
}


# -------------------------------------------------------------------------
# Regex patterns
# -------------------------------------------------------------------------

def normalize_text_for_signals(text: str) -> str:
    """Generic text normalization: dehyphenate compound words for regex matching.

    Converts e.g. "work-from-anywhere" -> "work from anywhere",
    "remote-first" -> "remote first", "location-agnostic" -> "location agnostic".
    Preserves actual hyphenated tokens like "on-site" which are also in patterns.
    """
    return re.sub(r"(?<=\w)-(?=\w)", " ", text)


# Negative signal patterns -- US-only, no-EU, Swiss-only
NEGATIVE_EU_PATTERN = re.compile(
    r"\b("
    r"us only|us-only|united states only"
    r"|must be based in the us|must be based in the united states"
    r"|us work authorization|authorized to work in the united states"
    r"|us citizens? (?:and|or) permanent residents?"
    r"|no eu applicants?|cannot accept applications? from eu"
    r"|outside the european union"
    r"|must be based in switzerland|swiss work permit"
    r")\b",
    re.IGNORECASE,
)

# US-implicit signal patterns -- salary in USD, US benefits, US government
US_IMPLICIT_PATTERN = re.compile(
    r"("
    r"\$\d{2,3}k"                          # $100k, $200K
    r"|\$\d{3},?\d{3}"                     # $100,000 or $100000
    r"|USD\s*\d"                            # USD 100...
    r"|401\(?k\)?"                          # 401k, 401(k)
    r"|medical,?\s*dental,?\s*(?:and\s*)?vision"  # US benefits trio
    r"|\bDoD\b|\bSBIR\b"                   # US defense
    r"|\bsecurity clearance\b"             # US clearance
    r"|\bW-?2\b"                           # W2 employment
    r"|\bUS\s*(?:holidays?|PTO)\b"         # US time off
    r")",
    re.IGNORECASE,
)

# EU timezone / business hours patterns
EU_TIMEZONE_PATTERN = re.compile(
    r"("
    r"\beu\s*timezone\b"
    r"|\beuropean business hours\b"
    r"|cet\s*[+-]\s*\d"
    r"|[+-]\s*\d+\s*hours?\s*cet"
    r"|\boverlap with (?:cet|european)\b"
    r")",
    re.IGNORECASE,
)

# Workers AI model for classification
WORKERS_AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8"
