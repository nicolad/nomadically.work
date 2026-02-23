"""D1 database helpers and JS interop utilities for Python Workers."""

import json
import asyncio
from js import JSON


def to_js_obj(d: dict):
    """Convert Python dict to JS object via JSON round-trip."""
    return JSON.parse(json.dumps(d))


def to_py(js_val):
    """Convert JS proxy value to Python dict/list via JSON round-trip."""
    return json.loads(JSON.stringify(js_val))


async def d1_all(db, sql: str, params: list | None = None) -> list[dict]:
    """Execute D1 SELECT and return rows as Python list of dicts."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    result = await stmt.all()
    return to_py(result.results)


async def d1_run(db, sql: str, params: list | None = None):
    """Execute D1 write (INSERT/UPDATE/DELETE)."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    await stmt.run()


async def d1_first(db, sql: str, params: list | None = None) -> dict | None:
    """Execute D1 SELECT and return first row or None."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    result = await stmt.first()
    if result is None:
        return None
    return to_py(result)


async def sleep_ms(ms: int):
    """Async sleep for given milliseconds."""
    await asyncio.sleep(ms / 1000)


def guard_content(content) -> str | None:
    """Normalize Workers AI content, handling JsNull/JsProxy."""
    if content is None:
        return None

    # Detect JsProxy from Pyodide
    if str(type(content)) == "<class 'pyodide.ffi.JsProxy'>":
        s = str(content)
        if not s or s.lower() in ("jsnull", "undefined", "null"):
            return None
        return s

    s = str(content).strip()
    return s if s else None
