"""Deterministic signal extraction from ATS-enriched job data.

Extracts structured boolean/string signals (remote flags, country codes,
negative signals, EU timezone mentions) that feed both the keyword
heuristic and the LLM classification prompt.
"""

import json
import re

from constants import (
    EU_ISO_CODES,
    EU_COUNTRY_NAMES,
    COUNTRY_NAME_TO_ISO,
    NEGATIVE_EU_PATTERN,
    US_IMPLICIT_PATTERN,
    EU_TIMEZONE_PATTERN,
    normalize_text_for_signals,
)


def extract_eu_signals(job: dict) -> dict:
    """Extract deterministic EU-related signals from ATS-enriched job data.

    Returns a dict of boolean/string signals that the keyword heuristic
    and LLM prompt can use for classification.
    """
    signals: dict = {
        "ats_remote": False,
        "eu_country_code": False,
        "country_code": None,
        "negative_signals": [],
        "us_implicit_signals": [],
        "eu_timezone": False,
        "eu_countries_in_location": [],
        "all_locations": [],
    }

    # ATS remote flag -- from ashby_is_remote or workplace_type
    ashby_remote = job.get("ashby_is_remote")
    workplace = (job.get("workplace_type") or "").lower()
    location_lower = (job.get("location") or "").lower().strip()
    if (ashby_remote == 1 or ashby_remote is True
            or workplace == "remote"
            or location_lower == "remote"
            or location_lower.startswith("remote ")):
        signals["ats_remote"] = True

    # Country code -> EU membership check
    raw_country = (job.get("country") or "").strip()
    country = raw_country.upper()
    if country and re.fullmatch(r"[A-Z]{2,3}", country):
        signals["country_code"] = country
        if country in EU_ISO_CODES:
            signals["eu_country_code"] = True
    elif raw_country:
        iso = COUNTRY_NAME_TO_ISO.get(raw_country.lower())
        if iso:
            signals["country_code"] = iso
            if iso in EU_ISO_CODES:
                signals["eu_country_code"] = True

    # Fallback: extract country from ashby_address if still no country_code
    if not signals["country_code"]:
        try:
            addr = job.get("ashby_address")
            if isinstance(addr, str):
                addr = json.loads(addr)
            if isinstance(addr, dict):
                postal = addr.get("postalAddress") or addr
                addr_country = (postal.get("addressCountry") or "").strip()
                addr_locality = (postal.get("addressLocality") or "").strip()
                for candidate in [addr_country, addr_locality]:
                    if not candidate:
                        continue
                    upper = candidate.upper()
                    if re.fullmatch(r"[A-Z]{2,3}", upper):
                        signals["country_code"] = upper
                        if upper in EU_ISO_CODES:
                            signals["eu_country_code"] = True
                        break
                    iso = COUNTRY_NAME_TO_ISO.get(candidate.lower())
                    if iso:
                        signals["country_code"] = iso
                        if iso in EU_ISO_CODES:
                            signals["eu_country_code"] = True
                        break
        except Exception:
            pass

    # Fallback: extract country from location string (e.g. "USA | Remote")
    if not signals["country_code"] and location_lower:
        for token in re.split(r"[|,/\-\u2013\u2014]+", location_lower):
            token = token.strip().rstrip(".")
            if not token or token == "remote":
                continue
            iso = COUNTRY_NAME_TO_ISO.get(token)
            if iso:
                signals["country_code"] = iso
                if iso in EU_ISO_CODES:
                    signals["eu_country_code"] = True
                break
            upper = token.upper()
            if re.fullmatch(r"[A-Z]{2}", upper):
                signals["country_code"] = upper
                if upper in EU_ISO_CODES:
                    signals["eu_country_code"] = True
                break

    # Negative signals via regex on description
    desc = (job.get("description") or "")[:8000].lower()
    location = (job.get("location") or "").lower()
    full_text = normalize_text_for_signals(f"{location} {desc}")
    for m in NEGATIVE_EU_PATTERN.finditer(full_text):
        signals["negative_signals"].append(m.group(0))

    # US-implicit signals via regex on description
    us_implicit: list[str] = []
    for m in US_IMPLICIT_PATTERN.finditer(full_text):
        us_implicit.append(m.group(0))
    signals["us_implicit_signals"] = us_implicit

    # EU timezone / business hours
    if EU_TIMEZONE_PATTERN.search(full_text):
        signals["eu_timezone"] = True

    # EU country names in location string
    for name in EU_COUNTRY_NAMES:
        if name in location:
            signals["eu_countries_in_location"].append(name)

    # Aggregate all ATS locations
    all_locs: list[str] = []
    if job.get("location"):
        all_locs.append(job["location"])

    # offices (Greenhouse JSON array)
    try:
        offices = job.get("offices")
        if isinstance(offices, str):
            offices = json.loads(offices)
        if isinstance(offices, list):
            for o in offices:
                name = o.get("name") or o.get("location") if isinstance(o, dict) else str(o)
                if name:
                    all_locs.append(name)
    except Exception:
        pass

    # categories.allLocations (Ashby/Lever JSON)
    try:
        cats = job.get("categories")
        if isinstance(cats, str):
            cats = json.loads(cats)
        if isinstance(cats, dict):
            for loc in (cats.get("allLocations") or []):
                if loc and loc not in all_locs:
                    all_locs.append(loc)
    except Exception:
        pass

    # ashby_secondary_locations
    try:
        sec = job.get("ashby_secondary_locations")
        if isinstance(sec, str):
            sec = json.loads(sec)
        if isinstance(sec, list):
            for s in sec:
                loc_name = s.get("location") if isinstance(s, dict) else str(s)
                if loc_name and loc_name not in all_locs:
                    all_locs.append(loc_name)
    except Exception:
        pass

    signals["all_locations"] = all_locs
    return signals


def format_signals(signals: dict) -> str:
    """Format extracted signals as a text block for the LLM prompt."""
    parts: list[str] = []

    if signals["ats_remote"]:
        parts.append("- ATS remote flag: YES")
    if signals["country_code"]:
        eu_label = " (EU member)" if signals["eu_country_code"] else " (NOT EU)"
        parts.append(f"- Country code: {signals['country_code']}{eu_label}")
    if signals["negative_signals"]:
        parts.append(f"- Negative signals: {', '.join(signals['negative_signals'][:5])}")
    if signals["eu_timezone"]:
        parts.append("- EU timezone/business hours signal detected")
    if signals["eu_countries_in_location"]:
        parts.append(f"- EU countries in location: {', '.join(signals['eu_countries_in_location'][:5])}")
    if len(signals["all_locations"]) > 1:
        parts.append(f"- All ATS locations: {', '.join(signals['all_locations'][:8])}")

    return "\n".join(parts) if parts else "- No structured ATS signals available"
