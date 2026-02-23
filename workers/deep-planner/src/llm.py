"""LangChain-compatible DeepSeek chat client for Cloudflare Python Workers.

Implements LangChain's message types and BaseChatModel interface using
js.fetch (Workers-native HTTP) instead of httpx/aiohttp, which have
import issues in the Pyodide runtime.

Usage:
    from llm import ChatDeepSeek, SystemMessage, HumanMessage

    llm = ChatDeepSeek(api_key=env.DEEPSEEK_API_KEY)
    result = await llm.ainvoke([
        SystemMessage(content="You are a helpful assistant."),
        HumanMessage(content="Write a product brief."),
    ])
    print(result.content)
"""

import json
from dataclasses import dataclass, field
from typing import Literal

from js import fetch as js_fetch, JSON as JsJSON

DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_CHAT = "deepseek-chat"
DEEPSEEK_REASONER = "deepseek-reasoner"


# ---------------------------------------------------------------------------
# LangChain-compatible message types
# ---------------------------------------------------------------------------

@dataclass
class SystemMessage:
    content: str
    type: Literal["system"] = field(default="system", init=False)


@dataclass
class HumanMessage:
    content: str
    type: Literal["human"] = field(default="human", init=False)


@dataclass
class AIMessage:
    content: str
    type: Literal["ai"] = field(default="ai", init=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ROLE_MAP = {"system": "system", "human": "user", "ai": "assistant"}


def _to_api_messages(messages: list) -> list[dict]:
    """Convert LangChain-style messages to DeepSeek API message format."""
    return [{"role": _ROLE_MAP[m.type], "content": m.content} for m in messages]


# ---------------------------------------------------------------------------
# ChatDeepSeek — LangChain BaseChatModel interface via js.fetch
# ---------------------------------------------------------------------------

class ChatDeepSeek:
    """Async chat model that calls the DeepSeek API via Workers-native js.fetch.

    Follows LangChain's BaseChatModel interface (.ainvoke([messages])) so it
    can be swapped for any LangChain chat model without changing call sites.
    """

    def __init__(
        self,
        api_key: str,
        model: str = DEEPSEEK_CHAT,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    @property
    def _llm_type(self) -> str:
        return "deepseek"

    async def ainvoke(self, messages: list) -> AIMessage:
        """Invoke the model with a list of messages, return AIMessage.

        Args:
            messages: List of SystemMessage / HumanMessage / AIMessage

        Returns:
            AIMessage with the model's response

        Raises:
            RuntimeError: On non-2xx API response or missing content
        """
        payload = json.dumps({
            "model": self.model,
            "messages": _to_api_messages(messages),
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        })

        request_init = JsJSON.parse(json.dumps({
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            "body": payload,
        }))

        response = await js_fetch(DEEPSEEK_BASE_URL, request_init)
        response_text = str(await response.text())
        data = json.loads(response_text)

        if not response.ok:
            raise RuntimeError(
                f"DeepSeek API error {response.status}: "
                f"{data.get('error', {}).get('message', response_text)}"
            )

        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise RuntimeError(f"DeepSeek returned empty content: {response_text}")

        return AIMessage(content=str(content).strip())
