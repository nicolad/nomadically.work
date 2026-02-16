"""Stub tenacity module for Pyodide compatibility.

tenacity is a C-extension-dependent retrying library that doesn't work in
Pyodide. This stub provides all names imported by langchain_core so that
import chains succeed. Retry decorators become no-ops.

Covers all names imported by langchain_core:
  RetryCallState, Retrying, AsyncRetrying, RetryError,
  before_sleep_log, retry, retry_base,
  retry_if_exception_type, stop_after_attempt,
  wait_exponential, wait_exponential_jitter
"""

import functools


# ---------------------------------------------------------------------------
# Core classes
# ---------------------------------------------------------------------------

class RetryCallState:
    """Stub for tenacity.RetryCallState."""

    def __init__(self, *args, **kwargs):
        self.outcome = None
        self.attempt_number = 1
        self.retry_object = None
        self.next_action = None
        self.idle_for = 0


class RetryError(Exception):
    """Stub for tenacity.RetryError."""

    def __init__(self, last_attempt=None):
        self.last_attempt = last_attempt
        super().__init__(last_attempt)


class _BaseRetrying:
    """Shared base for Retrying / AsyncRetrying stubs."""

    def __init__(self, **kwargs):
        self._kwargs = kwargs

    def __iter__(self):
        yield None

    def __call__(self, fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            return fn(*a, **kw)
        return wrapper


class Retrying(_BaseRetrying):
    """Stub for tenacity.Retrying — executes without retrying."""
    pass


class AsyncRetrying(_BaseRetrying):
    """Stub for tenacity.AsyncRetrying — executes without retrying."""

    def __call__(self, fn):
        @functools.wraps(fn)
        async def wrapper(*a, **kw):
            return await fn(*a, **kw)
        return wrapper

    async def __aiter__(self):
        yield None


# ---------------------------------------------------------------------------
# Decorator & helpers
# ---------------------------------------------------------------------------

def retry(*args, **kwargs):
    """No-op retry decorator."""
    if len(args) == 1 and callable(args[0]):
        return args[0]
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            return fn(*a, **kw)
        return wrapper
    return decorator


class retry_base:
    """Stub for tenacity.retry_base."""

    def __init__(self, *args, **kwargs):
        pass

    def __and__(self, other):
        return self

    def __or__(self, other):
        return self

    def __call__(self, retry_state):
        return False


def retry_if_exception_type(*args, **kwargs):
    return retry_base()


def stop_after_attempt(n=3):
    return None


def wait_exponential(**kwargs):
    return None


def wait_exponential_jitter(**kwargs):
    return None


def before_sleep_log(logger, log_level, exc_info=False):
    def _before_sleep(retry_state):
        pass
    return _before_sleep


__version__ = "9.0.0"  # Stub version
