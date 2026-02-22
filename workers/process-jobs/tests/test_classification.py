"""Tests for the EU-remote classification heuristic pipeline."""

import pytest

from src.entry import (
    _extract_eu_signals,
    _keyword_eu_classify,
    _normalize_text_for_signals,
    _COUNTRY_NAME_TO_ISO,
    _US_IMPLICIT_PATTERN,
    EU_ISO_CODES,
    EU_COUNTRY_NAMES,
)


def _make_job(**overrides) -> dict:
    """Build a minimal job dict with sensible defaults."""
    base = {
        "external_id": "test-job-1",
        "title": "Software Engineer",
        "location": "",
        "description": "",
        "country": "",
        "ashby_is_remote": 0,
        "workplace_type": "",
    }
    base.update(overrides)
    return base


# =========================================================================
# Real-world regression: the two Ashby jobs that must classify as EU-remote
# =========================================================================

class TestEloquentAI:
    """Eloquent AI — US HQ, Ashby remote flag, 'global footprint' in description.

    DB values:
      country="United States", location="Remote", workplace_type="remote",
      ashby_is_remote=1, ashby_address=SF/California/US
    """

    def test_signal_extraction(self):
        job = _make_job(
            title="Software Engineer, Full-Stack @ Eloquent AI",
            country="United States",
            location="Remote",
            workplace_type="remote",
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressRegion":"California","addressCountry":"United States","addressLocality":"San Francisco"}}',
            description="Headquartered in San Francisco with a global footprint.",
        )
        signals = _extract_eu_signals(job)

        assert signals["ats_remote"] is True
        assert signals["country_code"] == "US"
        assert signals["eu_country_code"] is False

    def test_escalates_to_llm(self):
        """US remote + 'global footprint' (vague) → escalate to LLM, not auto-accept."""
        job = _make_job(
            title="Software Engineer, Full-Stack @ Eloquent AI",
            country="United States",
            location="Remote",
            workplace_type="remote",
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressRegion":"California","addressCountry":"United States","addressLocality":"San Francisco"}}',
            description="Headquartered in San Francisco with a global footprint.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # "global" is a vague signal → escalate to LLM for proper reasoning
        assert result is None


class TestRoboflow:
    """Roboflow — No ATS remote flag, but location='Remote', 'distributed across the globe'.

    DB values:
      country=null, location="Remote", workplace_type=null,
      ashby_is_remote=0, ashby_address={"postalAddress":{}}
      description includes "distributed across the globe"
    """

    def test_signal_extraction(self):
        job = _make_job(
            title="Full Stack Engineer, AI Agents @ Roboflow",
            country="",
            location="Remote",
            workplace_type="",
            ashby_is_remote=0,
            ashby_address='{"postalAddress":{}}',
            description="We are building a diverse Satellite team that is distributed across the globe.",
        )
        signals = _extract_eu_signals(job)

        # location="Remote" should set ats_remote even without ATS flag
        assert signals["ats_remote"] is True
        assert signals["country_code"] is None

    def test_classified_as_eu_remote(self):
        """location='Remote' + no country + 'distributed across the globe' → EU-remote."""
        job = _make_job(
            title="Full Stack Engineer, AI Agents @ Roboflow",
            country="",
            location="Remote",
            workplace_type="",
            ashby_is_remote=0,
            ashby_address='{"postalAddress":{}}',
            description="We are building a diverse Satellite team that is distributed across the globe.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"
        assert "worldwide" in result.reason.lower()

    def test_location_remote_without_ats_flag(self):
        """Even without ashby_is_remote, location='Remote' should be treated as remote."""
        job = _make_job(
            ashby_is_remote=0,
            location="Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["ats_remote"] is True


class TestCybretAI:
    """CYBRET AI — Norway (EEA), Ashby remote flag, 'remote-friendly' in description.

    DB values:
      country=null, location="Oslo, Norway", workplace_type="remote",
      ashby_is_remote=1, ashby_address={"postalAddress":{"addressCountry":"","addressLocality":"Norway"}}
    """

    def test_signal_extraction(self):
        job = _make_job(
            title="Senior AI Engineer @ CYBRET AI",
            country="",
            location="Oslo, Norway",
            workplace_type="remote",
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"","addressLocality":"Norway"}}',
            description="Remote-friendly setup, freedom to build.",
        )
        signals = _extract_eu_signals(job)

        assert signals["ats_remote"] is True
        # ashby_address locality "Norway" → mapped to "NO" (EEA)
        assert signals["country_code"] == "NO"
        assert signals["eu_country_code"] is True
        assert "norway" in signals["eu_countries_in_location"]

    def test_classified_as_eu_remote(self):
        """Norway (EEA) + remote → EU-remote (high)."""
        job = _make_job(
            title="Senior AI Engineer @ CYBRET AI",
            country="",
            location="Oslo, Norway",
            workplace_type="remote",
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"","addressLocality":"Norway"}}',
            description="Remote-friendly setup, freedom to build.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_norway_in_location_without_address(self):
        """Even without ashby_address, 'Norway' in location triggers EU rule."""
        job = _make_job(
            location="Oslo, Norway",
            workplace_type="remote",
            ashby_is_remote=1,
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True


# =========================================================================
# Regression: Non-EU country + vague worldwide signal → escalate to LLM
# =========================================================================

class TestNonEUCanadaRegression:
    """Lazer job 58857c24 — Canada + 'distributed team' was misclassified as Remote EU.

    The vague worldwide signal 'distributed team' should NOT auto-accept;
    it should escalate to the LLM for proper reasoning.
    """

    def test_canada_distributed_team_escalates(self):
        """Canada + 'distributed team' (vague) → escalate to LLM."""
        job = _make_job(
            ashby_is_remote=1,
            country="Canada",
            location="Canada",
            description="We are a distributed team building great products.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is None  # Escalate, don't auto-accept

    def test_canada_globally_escalates(self):
        """Canada + 'globally' (vague) → escalate to LLM."""
        job = _make_job(
            ashby_is_remote=1,
            country="Canada",
            description="We hire globally and embrace remote work.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is None

    def test_canada_work_from_anywhere_accepts(self):
        """Canada + 'work from anywhere' (explicit) → still auto-accept."""
        job = _make_job(
            ashby_is_remote=1,
            country="Canada",
            description="Work from anywhere — we don't care where you are.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"


# =========================================================================
# EEA countries (Norway, Iceland, Liechtenstein)
# =========================================================================

class TestEEACountries:
    """EEA countries should be treated as EU for labour market access."""

    def test_norway_in_eu_iso_codes(self):
        assert "NO" in EU_ISO_CODES

    def test_iceland_in_eu_iso_codes(self):
        assert "IS" in EU_ISO_CODES

    def test_liechtenstein_in_eu_iso_codes(self):
        assert "LI" in EU_ISO_CODES

    def test_norway_in_country_names(self):
        assert "norway" in EU_COUNTRY_NAMES

    def test_iceland_in_country_names(self):
        assert "iceland" in EU_COUNTRY_NAMES

    def test_remote_norway_iso(self):
        job = _make_job(ashby_is_remote=1, country="NO")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


# =========================================================================
# Country name → ISO code mapping
# =========================================================================

class TestCountryNameMapping:
    """The country column stores full names; extraction must map to ISO codes."""

    def test_united_states_maps_to_us(self):
        assert _COUNTRY_NAME_TO_ISO["united states"] == "US"

    def test_norway_maps_to_no(self):
        assert _COUNTRY_NAME_TO_ISO["norway"] == "NO"

    def test_germany_maps_to_de(self):
        assert _COUNTRY_NAME_TO_ISO["germany"] == "DE"

    def test_full_country_name_extracted(self):
        """country='Germany' should map to DE and flag as EU."""
        job = _make_job(ashby_is_remote=1, country="Germany")
        signals = _extract_eu_signals(job)

        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_us_full_name_extracted(self):
        """country='United States' should map to US and NOT flag as EU."""
        job = _make_job(ashby_is_remote=1, country="United States")
        signals = _extract_eu_signals(job)

        assert signals["country_code"] == "US"
        assert signals["eu_country_code"] is False


# =========================================================================
# Description-based signals
# =========================================================================

class TestDescriptionSignals:
    """Heuristic should check description for EU/worldwide signals."""

    def test_global_footprint_in_description(self):
        """Non-EU HQ + remote + 'global' (vague) in description → escalate to LLM."""
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="We're a distributed team with a global footprint.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # "global" and "distributed team" are vague → escalate to LLM
        assert result is None

    def test_work_from_anywhere_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Work from anywhere — fully remote role.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_remote_friendly_in_description(self):
        """'remote-friendly' + 'distributed team' are vague → escalate to LLM."""
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Remote-friendly with a distributed team.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # Vague worldwide signals → escalate to LLM
        assert result is None

    def test_eu_work_authorization_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            description="EU work authorization required for this role.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_emea_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="GB",
            description="This role is open to candidates in EMEA.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_us_only_in_description_overrides_remote(self):
        """Negative signals in description should still reject."""
        job = _make_job(
            ashby_is_remote=1,
            description="This is for US only candidates. Global team.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"

    def test_no_description_signals_escalates_to_llm(self):
        """Non-EU country + remote but no description signals → escalate."""
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Join our team in building great products.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # No worldwide/global/EU signals in description → falls to LLM
        assert result is None


# =========================================================================
# Ashby address parsing
# =========================================================================

class TestAshbyAddressParsing:
    """ashby_address should be parsed for country info."""

    def test_address_country_extracted(self):
        job = _make_job(
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"Germany","addressLocality":"Berlin"}}',
        )
        signals = _extract_eu_signals(job)

        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_address_locality_fallback(self):
        """When addressCountry is empty, fall back to addressLocality."""
        job = _make_job(
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"","addressLocality":"Norway"}}',
        )
        signals = _extract_eu_signals(job)

        assert signals["country_code"] == "NO"
        assert signals["eu_country_code"] is True

    def test_address_iso_code(self):
        """addressCountry as ISO code."""
        job = _make_job(
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"SE"}}',
        )
        signals = _extract_eu_signals(job)

        assert signals["country_code"] == "SE"
        assert signals["eu_country_code"] is True

    def test_job_country_takes_precedence(self):
        """If job.country is set, ashby_address is not used."""
        job = _make_job(
            ashby_is_remote=1,
            country="FR",
            ashby_address='{"postalAddress":{"addressCountry":"United States"}}',
        )
        signals = _extract_eu_signals(job)

        assert signals["country_code"] == "FR"
        assert signals["eu_country_code"] is True


# =========================================================================
# Original tests (preserved)
# =========================================================================

class TestWorldwideRemoteHeuristic:
    """The core fix: worldwide remote jobs should be classified as EU-eligible."""

    def test_worldwide_remote_no_country(self):
        """ATS remote flag + no country → true, medium confidence."""
        job = _make_job(ashby_is_remote=1, country="")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"
        assert "worldwide" in result.reason.lower()

    def test_worldwide_remote_workplace_type(self):
        """workplace_type='remote' also triggers the worldwide rule."""
        job = _make_job(workplace_type="remote", country="")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"


class TestEUCountryRemote:
    """Remote + EU country code → high confidence accept."""

    def test_remote_eu_country(self):
        job = _make_job(ashby_is_remote=1, country="DE")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_remote_eu_country_france(self):
        job = _make_job(ashby_is_remote=1, country="FR")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


class TestNegativeSignals:
    """Negative signals → reject regardless of other flags."""

    def test_us_only_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="This position is for US only candidates.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"

    def test_must_be_based_in_us(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="Must be based in the United States.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"


class TestNonRemoteJobs:
    """Non-remote office jobs → reject."""

    def test_onsite_job(self):
        job = _make_job(
            ashby_is_remote=0,
            country="",
            description="This is an on-site position in our San Francisco office.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"

    def test_hybrid_location(self):
        job = _make_job(
            ashby_is_remote=0,
            country="",
            location="Hybrid - New York",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False


class TestNonEUCountryEscalation:
    """Remote + non-EU country with no description signals → escalate to LLM."""

    def test_remote_us_country_no_signals(self):
        job = _make_job(ashby_is_remote=1, country="US")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # US country code + no worldwide/global signals → falls through to LLM
        assert result is None

    def test_remote_us_full_name_no_signals(self):
        """Full country name 'United States' also maps to US → escalate."""
        job = _make_job(ashby_is_remote=1, country="United States")
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is None


class TestExplicitRemoteEU:
    """Explicit 'Remote - EU' in location → high confidence accept."""

    def test_remote_eu_location(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Remote - EU",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_remote_pipe_eu(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Remote | EU",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


class TestEUCountryInLocation:
    """EU/EEA country in location + remote → high confidence accept."""

    def test_norway_in_location(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Oslo, Norway",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_germany_in_location(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Berlin, Germany",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_spain_in_location(self):
        job = _make_job(
            workplace_type="remote",
            location="Remote - Spain",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True


# =========================================================================
# Text normalization (dehyphenation)
# =========================================================================

class TestNormalizeText:
    """_normalize_text_for_signals dehyphenates compound words generically."""

    def test_work_from_anywhere_hyphenated(self):
        assert "work from anywhere" in _normalize_text_for_signals("work-from-anywhere")

    def test_remote_first_hyphenated(self):
        assert "remote first" in _normalize_text_for_signals("remote-first")

    def test_location_agnostic_hyphenated(self):
        assert "location agnostic" in _normalize_text_for_signals("location-agnostic")

    def test_on_site_dehyphenated(self):
        """on-site also dehyphenates; patterns already handle both forms."""
        assert "on site" in _normalize_text_for_signals("on-site")

    def test_preserves_non_hyphen_text(self):
        assert _normalize_text_for_signals("hello world") == "hello world"

    def test_preserves_leading_hyphens(self):
        """Hyphens not between word chars are preserved."""
        assert _normalize_text_for_signals("-flag") == "-flag"


# =========================================================================
# US-implicit signal detection
# =========================================================================

class TestUSImplicitSignals:
    """US-implicit pattern detects USD salary, US benefits, US gov signals."""

    def test_usd_salary_100k(self):
        assert _US_IMPLICIT_PATTERN.search("$100k - $200k")

    def test_usd_salary_comma(self):
        assert _US_IMPLICIT_PATTERN.search("$100,000")

    def test_usd_salary_no_comma(self):
        assert _US_IMPLICIT_PATTERN.search("$100000")

    def test_401k(self):
        assert _US_IMPLICIT_PATTERN.search("401k matching")

    def test_401k_parens(self):
        assert _US_IMPLICIT_PATTERN.search("401(k) plan")

    def test_medical_dental_vision(self):
        assert _US_IMPLICIT_PATTERN.search("Medical, dental, and vision insurance")

    def test_dod(self):
        assert _US_IMPLICIT_PATTERN.search("DoD SBIR Phase II")

    def test_security_clearance(self):
        assert _US_IMPLICIT_PATTERN.search("Must hold security clearance")

    def test_w2(self):
        assert _US_IMPLICIT_PATTERN.search("W-2 employment")

    def test_no_match_on_eu_text(self):
        assert not _US_IMPLICIT_PATTERN.search("Remote role in Berlin, Germany. EU timezone overlap required.")

    def test_signals_extracted_into_dict(self):
        job = _make_job(
            ashby_is_remote=1,
            description="Salary $150k. Medical, dental, vision. 401(k).",
        )
        signals = _extract_eu_signals(job)
        assert len(signals["us_implicit_signals"]) >= 2


# =========================================================================
# US-implicit signals block worldwide-remote auto-accept
# =========================================================================

class TestUSImplicitBlocksAutoAccept:
    """Jobs with US-implicit signals should escalate to LLM, not auto-accept."""

    def test_neuroscale_regression(self):
        """Neuroscale: ATS remote + no country + USD salary + DoD → escalate."""
        job = _make_job(
            title="Founding Software Engineer - Typescript @ Neuroscale AI",
            ashby_is_remote=1,
            country="",
            ashby_address='{"postalAddress":{}}',
            description=(
                "Neuroscale recently received a $1.2M DoD SBIR Phase II award. "
                "Compensation: $100K–$200K. Benefits: Medical, dental, vision, "
                "14-days of PTO."
            ),
        )
        signals = _extract_eu_signals(job)
        assert len(signals["us_implicit_signals"]) >= 2

        result = _keyword_eu_classify(job, signals)
        # Should NOT auto-accept; should escalate to LLM (return None)
        assert result is None

    def test_us_salary_no_country_escalates(self):
        """ATS remote + no country + $150k salary → escalate, don't auto-accept."""
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="Compensation: $150k base. Join our remote team.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)
        assert result is None

    def test_us_benefits_no_country_escalates(self):
        """401(k) + medical/dental/vision → escalate."""
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="Benefits include 401(k), medical, dental, and vision.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)
        assert result is None

    def test_us_signals_with_eu_timezone_still_accepts(self):
        """US signals + EU timezone → EU signals present, don't block."""
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="$150k salary. Must overlap with EU timezone.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # EU timezone signal present → worldwide catch-all can still fire
        assert result is not None
        assert result.isRemoteEU is True

    def test_us_signals_with_eu_country_still_accepts(self):
        """EU country code overrides US-implicit signals."""
        job = _make_job(
            ashby_is_remote=1,
            country="DE",
            description="Compensation: $150k equivalent. 401(k).",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


# =========================================================================
# Location-string country extraction
# =========================================================================

class TestLocationCountryExtraction:
    """Country should be extracted from location string as fallback."""

    def test_usa_pipe_remote(self):
        """'USA | Remote' → country_code = 'US'."""
        job = _make_job(
            ashby_is_remote=1,
            location="USA | Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] == "US"
        assert signals["eu_country_code"] is False

    def test_usa_pipe_remote_not_worldwide(self):
        """Deepgram regression: 'USA | Remote' should NOT auto-accept as EU."""
        job = _make_job(
            ashby_is_remote=1,
            location="USA | Remote",
            description="Join our engineering team. Build speech AI.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # US country extracted → not worldwide catch-all, no worldwide signals → escalate
        assert result is None

    def test_us_dash_remote(self):
        """'US - Remote' → country_code = 'US'."""
        job = _make_job(
            ashby_is_remote=1,
            location="US - Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] == "US"

    def test_uk_comma_remote(self):
        """'UK, Remote' → country_code = 'GB'."""
        job = _make_job(
            ashby_is_remote=1,
            location="UK, Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] == "GB"

    def test_de_pipe_remote(self):
        """'DE | Remote' → country_code = 'DE', eu_country_code = True."""
        job = _make_job(
            ashby_is_remote=1,
            location="DE | Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_germany_slash_remote(self):
        """'Germany / Remote' → country_code = 'DE'."""
        job = _make_job(
            ashby_is_remote=1,
            location="Germany / Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_job_country_takes_precedence_over_location(self):
        """Explicit job.country field wins over location-string extraction."""
        job = _make_job(
            ashby_is_remote=1,
            country="FR",
            location="USA | Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] == "FR"

    def test_plain_remote_no_country_extracted(self):
        """'Remote' alone should not extract any country."""
        job = _make_job(
            ashby_is_remote=1,
            location="Remote",
        )
        signals = _extract_eu_signals(job)
        assert signals["country_code"] is None


# =========================================================================
# Country name abbreviation mapping
# =========================================================================

class TestCountryAbbreviations:
    """Common abbreviations should map to correct ISO codes."""

    def test_usa_maps_to_us(self):
        assert _COUNTRY_NAME_TO_ISO["usa"] == "US"

    def test_us_dot_maps_to_us(self):
        assert _COUNTRY_NAME_TO_ISO["u.s."] == "US"

    def test_usa_dot_maps_to_us(self):
        assert _COUNTRY_NAME_TO_ISO["u.s.a."] == "US"

    def test_uk_maps_to_gb(self):
        assert _COUNTRY_NAME_TO_ISO["uk"] == "GB"


# =========================================================================
# Hyphenated worldwide signals (via normalization)
# =========================================================================

class TestHyphenatedWorldwideSignals:
    """Hyphenated variants should match after text normalization."""

    def test_work_from_anywhere_hyphenated(self):
        """'work-from-anywhere' should match worldwide pattern after normalization."""
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Flexibility: work-from-anywhere policy.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"

    def test_digital_nomad_in_description(self):
        """'digital nomad' should be recognized as a worldwide signal."""
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="We support digital nomad lifestyles.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_remote_first_hyphenated_with_country(self):
        """'Remote-first' + non-EU country → vague signal, escalate to LLM."""
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="We are a remote-first company.",
        )
        signals = _extract_eu_signals(job)
        result = _keyword_eu_classify(job, signals)

        # "remote-first" is vague → escalate to LLM
        assert result is None
