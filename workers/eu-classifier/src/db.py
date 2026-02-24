"""D1 database helpers for the EU classifier worker."""

import json

from js import JSON


def to_js_obj(d: dict):
    """Convert a Python dict to a JS object via JSON round-trip."""
    return JSON.parse(json.dumps(d))


def to_py(js_val):
    """Convert a JS proxy value to a Python dict/list via JSON round-trip."""
    return json.loads(JSON.stringify(js_val))


async def d1_all(db, sql: str, params: list | None = None) -> list[dict]:
    """Execute a D1 SELECT and return rows as Python list of dicts."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    result = await stmt.all()
    return to_py(result.results)


async def d1_run(db, sql: str, params: list | None = None):
    """Execute a D1 write statement (INSERT/UPDATE/DELETE)."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    await stmt.run()
