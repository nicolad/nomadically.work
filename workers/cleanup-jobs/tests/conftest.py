"""Mock Cloudflare Workers runtime modules so entry.py can be imported in pytest."""

import os
import sys
import types

# Make `from entry import ...` work regardless of where pytest is invoked from.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

# ---- js module (Cloudflare Workers JS interop) ----
js_mock = types.ModuleType("js")
js_mock.JSON = types.SimpleNamespace(
    parse=lambda x: x,
    stringify=lambda x: str(x),
)
sys.modules["js"] = js_mock

# ---- workers module ----
workers_mock = types.ModuleType("workers")
workers_mock.Response = type(
    "Response", (), {"json": staticmethod(lambda body, **kw: body)}
)


class _MockEntrypoint:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)


workers_mock.WorkerEntrypoint = _MockEntrypoint
sys.modules["workers"] = workers_mock
