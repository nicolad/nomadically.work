"""Integration tests for db.py — Fix 1.

Verifies that the non-existent 'tags' column is absent from both the SQL
query and the returned result dict.  Prior to the fix, get_job() issued
  SELECT … tags FROM jobs WHERE id=?
which caused a 'no such column: tags' error on D1, breaking every HTTP
endpoint (report-job, confirm-report, restore-job).
"""

import asyncio
import types
from unittest.mock import AsyncMock, MagicMock

from db import get_job


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db(row_attrs: dict | None):
    """Return a minimal async D1 mock.

    The mock captures the SQL passed to db.prepare() so tests can assert
    on it.  row_attrs, if given, is exposed as a SimpleNamespace so that
    getattr(row, key, None) behaves correctly for both present and absent
    attributes.
    """
    row = types.SimpleNamespace(**row_attrs) if row_attrs is not None else None
    stmt = MagicMock()
    stmt.bind.return_value = stmt
    stmt.first = AsyncMock(return_value=row)
    db = MagicMock()
    db.prepare.return_value = stmt
    return db


def _run(coro):
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetJobSqlNoDanglingTagsColumn:
    """The SQL issued by get_job() must not reference the 'tags' column."""

    def test_sql_does_not_contain_tags(self):
        db = _make_db(None)
        _run(get_job(db, 1))

        sql_issued = db.prepare.call_args[0][0]
        assert "tags" not in sql_issued.lower(), (
            f"'tags' found in SQL — will cause 'no such column: tags' on D1:\n{sql_issued}"
        )

    def test_sql_contains_expected_columns(self):
        db = _make_db(None)
        _run(get_job(db, 1))

        sql = db.prepare.call_args[0][0]
        for col in ("id", "title", "url", "status", "description", "is_remote_eu"):
            assert col in sql, f"Expected column '{col}' missing from SQL: {sql}"

    def test_job_id_is_bound_as_parameter(self):
        db = _make_db(None)
        _run(get_job(db, 66))
        db.prepare.return_value.bind.assert_called_once_with(66)


class TestGetJobReturnValue:
    """get_job() result dict must never include 'tags'."""

    def test_returns_none_when_row_missing(self):
        assert _run(get_job(_make_db(None), 99)) is None

    def test_result_has_no_tags_key(self):
        db = _make_db({
            "id": 66, "title": "Senior Engineer", "company": "kraken.com",
            "location": "Remote", "url": "https://jobs.ashbyhq.com/kraken/uuid",
            "status": "enhanced", "description": "A great job",
            "report_trace_id": None, "is_remote_eu": True,
        })
        result = _run(get_job(db, 66))
        assert "tags" not in result

    def test_result_contains_expected_fields(self):
        db = _make_db({
            "id": 66, "title": "Senior Engineer", "company": "kraken.com",
            "location": "Remote", "url": "https://jobs.ashbyhq.com/kraken/uuid",
            "status": "enhanced", "description": "desc",
            "report_trace_id": "trace-abc", "is_remote_eu": True,
        })
        result = _run(get_job(db, 66))

        assert result["id"] == 66
        assert result["title"] == "Senior Engineer"
        assert result["company"] == "kraken.com"
        assert result["remote"] is True
        assert result["report_trace_id"] == "trace-abc"

    def test_remote_field_is_bool_coerced(self):
        """is_remote_eu is exposed as 'remote' (bool) in the result."""
        db = _make_db({
            "id": 1, "title": "T", "company": "c", "location": None,
            "url": "u", "status": None, "description": None,
            "report_trace_id": None, "is_remote_eu": False,
        })
        result = _run(get_job(db, 1))
        assert result["remote"] is False
        assert "is_remote_eu" not in result
