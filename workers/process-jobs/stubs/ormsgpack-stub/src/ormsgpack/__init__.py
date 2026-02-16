"""Stub ormsgpack module for Pyodide compatibility.

ormsgpack is a C extension that doesn't have a Pyodide wheel.
This stub provides the minimal API needed by langgraph-checkpoint
using JSON as a fallback.

Based on the official langchain-cloudflare stub, extended with Ext and
MsgpackEncodeError for full langgraph.checkpoint.serde.jsonplus compatibility.
"""

import json
from typing import Any


# ---------------------------------------------------------------------------
# Constants / option flags (referenced by langgraph-checkpoint)
# ---------------------------------------------------------------------------

OPT_SERIALIZE_NUMPY = 1
OPT_SERIALIZE_DATACLASS = 2
OPT_SERIALIZE_UUID = 4
OPT_UTC_Z = 8
OPT_NAIVE_UTC = 16
OPT_OMIT_MICROSECONDS = 32
OPT_PASSTHROUGH_BIG_INT = 64
OPT_PASSTHROUGH_DATACLASS = 128
OPT_PASSTHROUGH_DATETIME = 256
OPT_PASSTHROUGH_SUBCLASS = 512
OPT_NON_STR_KEYS = 1024
OPT_PASSTHROUGH_ENUM = 2048
OPT_PASSTHROUGH_UUID = 4096


# ---------------------------------------------------------------------------
# Ext type (used by jsonplus serializers)
# ---------------------------------------------------------------------------

class Ext:
    """Minimal stub for ormsgpack.Ext (MessagePack extension type)."""

    def __init__(self, code: int, data: bytes = b""):
        self.code = code
        self.data = data

    def __repr__(self) -> str:
        return f"Ext(code={self.code}, data={self.data!r})"

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Ext):
            return self.code == other.code and self.data == other.data
        return NotImplemented


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class MsgpackEncodeError(Exception):
    """Raised when msgpack encoding fails."""
    pass


class MsgpackDecodeError(Exception):
    """Raised when msgpack decoding fails."""
    pass


# ---------------------------------------------------------------------------
# Pack / Unpack — JSON fallback
# ---------------------------------------------------------------------------

def _default_handler(obj: Any) -> Any:
    """Fallback for objects that json.dumps can't handle natively."""
    if isinstance(obj, Ext):
        return {"__ext__": True, "code": obj.code, "data": list(obj.data)}
    if isinstance(obj, bytes):
        return {"__bytes__": True, "data": list(obj)}
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def packb(obj: Any, *, default=None, option: int | None = None) -> bytes:
    """Serialize object to bytes (JSON fallback).

    Parameters
    ----------
    obj : Any
        Object to serialize.
    default : callable, optional
        Custom serializer for objects that aren't natively serializable.
    option : int, optional
        ormsgpack option flags (accepted but ignored in stub).
    """
    try:
        handler = default or _default_handler
        return json.dumps(obj, default=handler).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise MsgpackEncodeError(str(exc)) from exc


def unpackb(
    data: bytes,
    *,
    ext_hook: Any = None,
    option: int | None = None,
) -> Any:
    """Deserialize bytes to object (JSON fallback).

    Parameters
    ----------
    data : bytes
        Data to deserialize.
    ext_hook : callable, optional
        Hook for handling Ext types (accepted but ignored in fallback).
    option : int, optional
        ormsgpack option flags (accepted but ignored in stub).
    """
    try:
        return json.loads(data.decode("utf-8") if isinstance(data, bytes) else data)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise MsgpackDecodeError(str(exc)) from exc


__version__ = "1.10.0"  # Stub version
