"""Integration tests for cleanup-jobs entry.py — Fix 3.

Verifies that cleanup_old_jobs() and get_stale_stats() exclude recently-
updated jobs via a second cutoff (updated_at < recent_cutoff).

Prior to the fix the only guard was `posted_at < cutoff`.  A job posted 35
days ago but enhanced yesterday would be wiped — resetting its title to
'[stale]' and NULLing all ATS data.  Long-running Ashby listings (e.g.
Kraken) are particularly affected because they stay open for months.

The fix adds:
    AND (updated_at IS NULL OR updated_at < recent_cutoff)
where recent_cutoff = now - 7 days.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, call

from entry import cleanup_old_jobs, get_stale_stats, CUTOFF_DAYS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RECENT_GUARD_DAYS = 7


def _run(coro):
    return asyncio.run(coro)


def _make_d1_all(side_effects: list):
    """Return an async mock for d1_all that yields side_effects in order."""
    mock = AsyncMock(side_effect=side_effects)
    return mock


# ---------------------------------------------------------------------------
# SQL shape tests
# ---------------------------------------------------------------------------

class TestCleanupSqlIncludesUpdatedAtGuard:
    """The SQL queries must filter by updated_at, not just posted_at."""

    def test_count_query_includes_updated_at(self):
        captured = []

        async def fake_d1_all(db, sql, params=None):
            captured.append((sql, params or []))
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(cleanup_old_jobs(db=None, dry_run=True))

        count_sql, count_params = captured[0]
        assert "updated_at" in count_sql, (
            "Count query must filter by updated_at to exclude recently-enhanced jobs"
        )

    def test_count_query_passes_two_cutoff_params(self):
        """Two params: [cutoff (30d), recent_cutoff (7d)]."""
        captured_params = []

        async def fake_d1_all(db, sql, params=None):
            if params:
                captured_params.extend(params)
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(cleanup_old_jobs(db=None, dry_run=True))

        assert len(captured_params) == 2, (
            f"Expected 2 cutoff params (posted_at cutoff + recent_cutoff), got {captured_params}"
        )
        # Both must parse as ISO datetimes
        for p in captured_params:
            datetime.fromisoformat(p)  # raises if not a valid ISO string

    def test_batch_query_also_includes_updated_at(self):
        """The batch SELECT (used in the while-loop) must mirror the count query."""
        captured = []
        call_count = 0

        async def fake_d1_all(db, sql, params=None):
            nonlocal call_count
            call_count += 1
            captured.append(sql)
            if "count(*)" in sql:
                return [{"cnt": 1}]   # signal that cleanup should run
            return []                  # empty batch → loop exits

        async def fake_d1_run(db, sql, params=None):
            pass

        with patch("entry.d1_all", side_effect=fake_d1_all), \
             patch("entry.d1_run", new=AsyncMock(side_effect=fake_d1_run)):
            _run(cleanup_old_jobs(db=None, dry_run=False))

        # The second SQL call is the batch SELECT
        if len(captured) > 1:
            batch_sql = captured[1]
            assert "updated_at" in batch_sql, (
                "Batch SELECT must also filter by updated_at"
            )


class TestCleanupCutoffValues:
    """Verify the cutoff timestamps are approximately correct."""

    def test_cutoff_is_30_days_ago(self):
        captured_params = []

        async def fake_d1_all(db, sql, params=None):
            if params:
                captured_params.extend(params)
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(cleanup_old_jobs(db=None, dry_run=True))

        cutoff_str = captured_params[0]
        cutoff_dt = datetime.fromisoformat(cutoff_str)
        now = datetime.now(timezone.utc)
        delta_days = (now - cutoff_dt).days
        assert abs(delta_days - CUTOFF_DAYS) <= 1, (
            f"posted_at cutoff should be ~{CUTOFF_DAYS} days ago, got {delta_days} days"
        )

    def test_recent_cutoff_is_7_days_ago(self):
        captured_params = []

        async def fake_d1_all(db, sql, params=None):
            if params:
                captured_params.extend(params)
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(cleanup_old_jobs(db=None, dry_run=True))

        recent_cutoff_str = captured_params[1]
        recent_dt = datetime.fromisoformat(recent_cutoff_str)
        now = datetime.now(timezone.utc)
        delta_days = (now - recent_dt).days
        assert abs(delta_days - RECENT_GUARD_DAYS) <= 1, (
            f"recent_cutoff should be ~{RECENT_GUARD_DAYS} days ago, got {delta_days} days"
        )

    def test_recent_cutoff_is_more_recent_than_posted_at_cutoff(self):
        captured_params = []

        async def fake_d1_all(db, sql, params=None):
            if params:
                captured_params.extend(params)
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(cleanup_old_jobs(db=None, dry_run=True))

        cutoff_dt = datetime.fromisoformat(captured_params[0])
        recent_dt = datetime.fromisoformat(captured_params[1])
        assert recent_dt > cutoff_dt, (
            "recent_cutoff (7d) must be more recent than posted_at cutoff (30d)"
        )


# ---------------------------------------------------------------------------
# Behaviour tests
# ---------------------------------------------------------------------------

class TestCleanupBehaviour:
    """Verify that recently-updated jobs are not marked stale."""

    def test_zero_eligible_when_count_returns_zero(self):
        async def fake_d1_all(db, sql, params=None):
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            result = _run(cleanup_old_jobs(db=None, dry_run=False))

        assert result["marked_stale"] == 0

    def test_dry_run_returns_would_mark_stale_and_cutoffs(self):
        async def fake_d1_all(db, sql, params=None):
            return [{"cnt": 5}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            result = _run(cleanup_old_jobs(db=None, dry_run=True))

        assert result["would_mark_stale"] == 5
        assert "cutoff" in result
        assert "recent_cutoff" in result

    def test_dry_run_does_not_call_d1_run(self):
        async def fake_d1_all(db, sql, params=None):
            return [{"cnt": 3}]

        with patch("entry.d1_all", side_effect=fake_d1_all), \
             patch("entry.d1_run", new=AsyncMock()) as mock_run:
            _run(cleanup_old_jobs(db=None, dry_run=True))

        mock_run.assert_not_called()


# ---------------------------------------------------------------------------
# get_stale_stats tests
# ---------------------------------------------------------------------------

class TestGetStaleStats:
    """get_stale_stats() must use the same updated_at guard so numbers match cleanup."""

    def test_eligible_query_includes_updated_at(self):
        captured_sqls = []

        async def fake_d1_all(db, sql, params=None):
            captured_sqls.append(sql)
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(get_stale_stats(db=None))

        eligible_sql = captured_sqls[0]
        assert "updated_at" in eligible_sql, (
            "get_stale_stats eligible query must include updated_at guard"
        )

    def test_eligible_query_passes_two_params(self):
        captured = []

        async def fake_d1_all(db, sql, params=None):
            captured.append(params or [])
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            _run(get_stale_stats(db=None))

        # First call = eligible count query → must receive [cutoff, recent_cutoff]
        assert len(captured[0]) == 2

    def test_stats_result_includes_cutoff_info(self):
        async def fake_d1_all(db, sql, params=None):
            return [{"cnt": 0}]

        with patch("entry.d1_all", side_effect=fake_d1_all):
            stats = _run(get_stale_stats(db=None))

        assert "cutoff" in stats
        assert "cutoff_days" in stats
        assert stats["cutoff_days"] == CUTOFF_DAYS
