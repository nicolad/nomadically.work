"""Mock the Cloudflare Workers runtime modules so entry.py can be imported in pytest."""

import sys
import types

# Create mock 'js' module (Cloudflare Workers JS interop)
js_mock = types.ModuleType("js")
js_mock.JSON = types.SimpleNamespace(parse=lambda x: x, stringify=lambda x: str(x))
js_mock.fetch = None  # not used in classification tests
sys.modules["js"] = js_mock

# Create mock 'workers' module
workers_mock = types.ModuleType("workers")
workers_mock.Response = type("Response", (), {"__init__": lambda self, *a, **kw: None})


class _MockEntrypoint:
    """Stand-in for workers.WorkerEntrypoint so the class definition loads."""
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)


workers_mock.WorkerEntrypoint = _MockEntrypoint
sys.modules["workers"] = workers_mock

# Mock langchain/langgraph modules (not needed for classification tests)
for mod_name in [
    "langchain_cloudflare",
    "langchain_core",
    "langchain_core.prompts",
    "langchain_core.runnables",
    "langgraph_checkpoint_cloudflare_d1",
]:
    mock = types.ModuleType(mod_name)
    # Provide stub classes that the module-level code references
    if mod_name == "langchain_cloudflare":
        mock.ChatCloudflareWorkersAI = type("ChatCloudflareWorkersAI", (), {})
    elif mod_name == "langchain_core.prompts":
        mock.ChatPromptTemplate = type(
            "ChatPromptTemplate", (),
            {"from_messages": classmethod(lambda cls, *a, **kw: None)},
        )
    elif mod_name == "langchain_core.runnables":
        mock.RunnableLambda = lambda fn: fn  # pass-through for tests
    elif mod_name == "langgraph_checkpoint_cloudflare_d1":
        mock.CloudflareD1Saver = type("CloudflareD1Saver", (), {})
    sys.modules[mod_name] = mock
