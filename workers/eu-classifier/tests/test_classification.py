"""Tests for the centralized EU-remote classification pipeline.

Ported from workers/process-jobs/tests/test_classification.py to test
the new modular eu-classifier worker.
"""

import pytest

from src.signals import extract_eu_signals
from src.heuristic import keyword_eu_classify
from src.constants import (
    normalize_text_for_signals,
    COUNTRY_NAME_TO_ISO,
    US_IMPLICIT_PATTERN,
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
    """Eloquent AI -- US HQ, Ashby remote flag, 'global footprint' in description."""

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
        signals = extract_eu_signals(job)

        assert signals["ats_remote"] is True
        assert signals["country_code"] == "US"
        assert signals["eu_country_code"] is False

    def test_escalates_to_llm(self):
        """US remote + 'global footprint' (vague) -> escalate to LLM, not auto-accept."""
        job = _make_job(
            title="Software Engineer, Full-Stack @ Eloquent AI",
            country="United States",
            location="Remote",
            workplace_type="remote",
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressRegion":"California","addressCountry":"United States","addressLocality":"San Francisco"}}',
            description="Headquartered in San Francisco with a global footprint.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None


class TestRoboflow:
    """Roboflow -- No ATS remote flag, but location='Remote', 'distributed across the globe'."""

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
        signals = extract_eu_signals(job)

        assert signals["ats_remote"] is True
        assert signals["country_code"] is None

    def test_classified_as_eu_remote(self):
        """location='Remote' + no country + 'distributed across the globe' -> EU-remote."""
        job = _make_job(
            title="Full Stack Engineer, AI Agents @ Roboflow",
            country="",
            location="Remote",
            workplace_type="",
            ashby_is_remote=0,
            ashby_address='{"postalAddress":{}}',
            description="We are building a diverse Satellite team that is distributed across the globe.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

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
        signals = extract_eu_signals(job)
        assert signals["ats_remote"] is True


class TestCybretAI:
    """CYBRET AI -- Norway (EEA), Ashby remote flag, 'remote-friendly' in description."""

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
        signals = extract_eu_signals(job)

        assert signals["ats_remote"] is True
        assert signals["country_code"] == "NO"
        assert signals["eu_country_code"] is True
        assert "norway" in signals["eu_countries_in_location"]

    def test_classified_as_eu_remote(self):
        """Norway (EEA) + remote -> EU-remote (high)."""
        job = _make_job(
            title="Senior AI Engineer @ CYBRET AI",
            country="",
            location="Oslo, Norway",
            workplace_type="remote",
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"","addressLocality":"Norway"}}',
            description="Remote-friendly setup, freedom to build.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

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
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True


# =========================================================================
# Regression: Non-EU country + vague worldwide signal -> escalate to LLM
# =========================================================================

class TestNonEUCanadaRegression:
    """Lazer job -- Canada + 'distributed team' was misclassified as Remote EU."""

    def test_canada_distributed_team_escalates(self):
        job = _make_job(
            ashby_is_remote=1,
            country="Canada",
            location="Canada",
            description="We are a distributed team building great products.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None

    def test_canada_globally_escalates(self):
        job = _make_job(
            ashby_is_remote=1,
            country="Canada",
            description="We hire globally and embrace remote work.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None

    def test_canada_work_from_anywhere_accepts(self):
        job = _make_job(
            ashby_is_remote=1,
            country="Canada",
            description="Work from anywhere -- we don't care where you are.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

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
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


# =========================================================================
# Country name -> ISO code mapping
# =========================================================================

class TestCountryNameMapping:

    def test_united_states_maps_to_us(self):
        assert COUNTRY_NAME_TO_ISO["united states"] == "US"

    def test_norway_maps_to_no(self):
        assert COUNTRY_NAME_TO_ISO["norway"] == "NO"

    def test_germany_maps_to_de(self):
        assert COUNTRY_NAME_TO_ISO["germany"] == "DE"

    def test_full_country_name_extracted(self):
        job = _make_job(ashby_is_remote=1, country="Germany")
        signals = extract_eu_signals(job)

        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_us_full_name_extracted(self):
        job = _make_job(ashby_is_remote=1, country="United States")
        signals = extract_eu_signals(job)

        assert signals["country_code"] == "US"
        assert signals["eu_country_code"] is False


# =========================================================================
# Description-based signals
# =========================================================================

class TestDescriptionSignals:

    def test_global_footprint_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="We're a distributed team with a global footprint.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None

    def test_work_from_anywhere_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Work from anywhere -- fully remote role.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_remote_friendly_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Remote-friendly with a distributed team.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None

    def test_eu_work_authorization_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            description="EU work authorization required for this role.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_emea_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="GB",
            description="This role is open to candidates in EMEA.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_us_only_in_description_overrides_remote(self):
        job = _make_job(
            ashby_is_remote=1,
            description="This is for US only candidates. Global team.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"

    def test_no_description_signals_escalates_to_llm(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Join our team in building great products.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None


# =========================================================================
# Ashby address parsing
# =========================================================================

class TestAshbyAddressParsing:

    def test_address_country_extracted(self):
        job = _make_job(
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"Germany","addressLocality":"Berlin"}}',
        )
        signals = extract_eu_signals(job)

        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_address_locality_fallback(self):
        job = _make_job(
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"","addressLocality":"Norway"}}',
        )
        signals = extract_eu_signals(job)

        assert signals["country_code"] == "NO"
        assert signals["eu_country_code"] is True

    def test_address_iso_code(self):
        job = _make_job(
            ashby_is_remote=1,
            ashby_address='{"postalAddress":{"addressCountry":"SE"}}',
        )
        signals = extract_eu_signals(job)

        assert signals["country_code"] == "SE"
        assert signals["eu_country_code"] is True

    def test_job_country_takes_precedence(self):
        job = _make_job(
            ashby_is_remote=1,
            country="FR",
            ashby_address='{"postalAddress":{"addressCountry":"United States"}}',
        )
        signals = extract_eu_signals(job)

        assert signals["country_code"] == "FR"
        assert signals["eu_country_code"] is True


# =========================================================================
# Worldwide remote heuristic
# =========================================================================

class TestWorldwideRemoteHeuristic:

    def test_worldwide_remote_no_country(self):
        job = _make_job(ashby_is_remote=1, country="")
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"
        assert "worldwide" in result.reason.lower()

    def test_worldwide_remote_workplace_type(self):
        job = _make_job(workplace_type="remote", country="")
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"


# =========================================================================
# EU country + remote
# =========================================================================

class TestEUCountryRemote:

    def test_remote_eu_country(self):
        job = _make_job(ashby_is_remote=1, country="DE")
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_remote_eu_country_france(self):
        job = _make_job(ashby_is_remote=1, country="FR")
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


# =========================================================================
# Negative signals
# =========================================================================

class TestNegativeSignals:

    def test_us_only_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="This position is for US only candidates.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"

    def test_must_be_based_in_us(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="Must be based in the United States.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"


# =========================================================================
# Non-remote jobs
# =========================================================================

class TestNonRemoteJobs:

    def test_onsite_job(self):
        job = _make_job(
            ashby_is_remote=0,
            country="",
            description="This is an on-site position in our San Francisco office.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False
        assert result.confidence == "high"

    def test_hybrid_location(self):
        job = _make_job(
            ashby_is_remote=0,
            country="",
            location="Hybrid - New York",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is False


# =========================================================================
# Non-EU country escalation
# =========================================================================

class TestNonEUCountryEscalation:

    def test_remote_us_country_no_signals(self):
        job = _make_job(ashby_is_remote=1, country="US")
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None

    def test_remote_us_full_name_no_signals(self):
        job = _make_job(ashby_is_remote=1, country="United States")
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None


# =========================================================================
# Explicit Remote EU in location
# =========================================================================

class TestExplicitRemoteEU:

    def test_remote_eu_location(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Remote - EU",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_remote_pipe_eu(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Remote | EU",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


# =========================================================================
# EU country in location
# =========================================================================

class TestEUCountryInLocation:

    def test_norway_in_location(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Oslo, Norway",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_germany_in_location(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Berlin, Germany",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"

    def test_spain_in_location(self):
        job = _make_job(
            workplace_type="remote",
            location="Remote - Spain",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True


# =========================================================================
# Text normalization (dehyphenation)
# =========================================================================

class TestNormalizeText:

    def test_work_from_anywhere_hyphenated(self):
        assert "work from anywhere" in normalize_text_for_signals("work-from-anywhere")

    def test_remote_first_hyphenated(self):
        assert "remote first" in normalize_text_for_signals("remote-first")

    def test_location_agnostic_hyphenated(self):
        assert "location agnostic" in normalize_text_for_signals("location-agnostic")

    def test_on_site_dehyphenated(self):
        assert "on site" in normalize_text_for_signals("on-site")

    def test_preserves_non_hyphen_text(self):
        assert normalize_text_for_signals("hello world") == "hello world"

    def test_preserves_leading_hyphens(self):
        assert normalize_text_for_signals("-flag") == "-flag"


# =========================================================================
# US-implicit signal detection
# =========================================================================

class TestUSImplicitSignals:

    def test_usd_salary_100k(self):
        assert US_IMPLICIT_PATTERN.search("$100k - $200k")

    def test_usd_salary_comma(self):
        assert US_IMPLICIT_PATTERN.search("$100,000")

    def test_usd_salary_no_comma(self):
        assert US_IMPLICIT_PATTERN.search("$100000")

    def test_401k(self):
        assert US_IMPLICIT_PATTERN.search("401k matching")

    def test_401k_parens(self):
        assert US_IMPLICIT_PATTERN.search("401(k) plan")

    def test_medical_dental_vision(self):
        assert US_IMPLICIT_PATTERN.search("Medical, dental, and vision insurance")

    def test_dod(self):
        assert US_IMPLICIT_PATTERN.search("DoD SBIR Phase II")

    def test_security_clearance(self):
        assert US_IMPLICIT_PATTERN.search("Must hold security clearance")

    def test_w2(self):
        assert US_IMPLICIT_PATTERN.search("W-2 employment")

    def test_no_match_on_eu_text(self):
        assert not US_IMPLICIT_PATTERN.search("Remote role in Berlin, Germany. EU timezone overlap required.")

    def test_signals_extracted_into_dict(self):
        job = _make_job(
            ashby_is_remote=1,
            description="Salary $150k. Medical, dental, vision. 401(k).",
        )
        signals = extract_eu_signals(job)
        assert len(signals["us_implicit_signals"]) >= 2


# =========================================================================
# US-implicit signals block worldwide-remote auto-accept
# =========================================================================

class TestUSImplicitBlocksAutoAccept:

    def test_neuroscale_regression(self):
        job = _make_job(
            title="Founding Software Engineer - Typescript @ Neuroscale AI",
            ashby_is_remote=1,
            country="",
            ashby_address='{"postalAddress":{}}',
            description=(
                "Neuroscale recently received a $1.2M DoD SBIR Phase II award. "
                "Compensation: $100K-$200K. Benefits: Medical, dental, vision, "
                "14-days of PTO."
            ),
        )
        signals = extract_eu_signals(job)
        assert len(signals["us_implicit_signals"]) >= 2

        result = keyword_eu_classify(job, signals)
        assert result is None

    def test_us_salary_no_country_escalates(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="Compensation: $150k base. Join our remote team.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)
        assert result is None

    def test_us_benefits_no_country_escalates(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="Benefits include 401(k), medical, dental, and vision.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)
        assert result is None

    def test_us_signals_with_eu_timezone_still_accepts(self):
        job = _make_job(
            ashby_is_remote=1,
            country="",
            description="$150k salary. Must overlap with EU timezone.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_us_signals_with_eu_country_still_accepts(self):
        job = _make_job(
            ashby_is_remote=1,
            country="DE",
            description="Compensation: $150k equivalent. 401(k).",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "high"


# =========================================================================
# Location-string country extraction
# =========================================================================

class TestLocationCountryExtraction:

    def test_usa_pipe_remote(self):
        job = _make_job(
            ashby_is_remote=1,
            location="USA | Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] == "US"
        assert signals["eu_country_code"] is False

    def test_usa_pipe_remote_not_worldwide(self):
        job = _make_job(
            ashby_is_remote=1,
            location="USA | Remote",
            description="Join our engineering team. Build speech AI.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None

    def test_us_dash_remote(self):
        job = _make_job(
            ashby_is_remote=1,
            location="US - Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] == "US"

    def test_uk_comma_remote(self):
        job = _make_job(
            ashby_is_remote=1,
            location="UK, Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] == "GB"

    def test_de_pipe_remote(self):
        job = _make_job(
            ashby_is_remote=1,
            location="DE | Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_germany_slash_remote(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Germany / Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] == "DE"
        assert signals["eu_country_code"] is True

    def test_job_country_takes_precedence_over_location(self):
        job = _make_job(
            ashby_is_remote=1,
            country="FR",
            location="USA | Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] == "FR"

    def test_plain_remote_no_country_extracted(self):
        job = _make_job(
            ashby_is_remote=1,
            location="Remote",
        )
        signals = extract_eu_signals(job)
        assert signals["country_code"] is None


# =========================================================================
# Country name abbreviation mapping
# =========================================================================

class TestCountryAbbreviations:

    def test_usa_maps_to_us(self):
        assert COUNTRY_NAME_TO_ISO["usa"] == "US"

    def test_us_dot_maps_to_us(self):
        assert COUNTRY_NAME_TO_ISO["u.s."] == "US"

    def test_usa_dot_maps_to_us(self):
        assert COUNTRY_NAME_TO_ISO["u.s.a."] == "US"

    def test_uk_maps_to_gb(self):
        assert COUNTRY_NAME_TO_ISO["uk"] == "GB"


# =========================================================================
# Hyphenated worldwide signals (via normalization)
# =========================================================================

class TestHyphenatedWorldwideSignals:

    def test_work_from_anywhere_hyphenated(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="Flexibility: work-from-anywhere policy.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True
        assert result.confidence == "medium"

    def test_digital_nomad_in_description(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="We support digital nomad lifestyles.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is not None
        assert result.isRemoteEU is True

    def test_remote_first_hyphenated_with_country(self):
        job = _make_job(
            ashby_is_remote=1,
            country="US",
            description="We are a remote-first company.",
        )
        signals = extract_eu_signals(job)
        result = keyword_eu_classify(job, signals)

        assert result is None
