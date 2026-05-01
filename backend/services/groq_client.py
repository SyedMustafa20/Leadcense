import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROK_API_KEY"))
    return _client


def chat(messages: list[dict], temperature: float = 0.5, max_tokens: int = 500) -> str:
    resp = _get_client().chat.completions.create(
        model=_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()


def chat_json(messages: list[dict], temperature: float = 0.1, max_tokens: int = 1000) -> dict:
    """Call the LLM and parse the response as JSON. Returns empty dict on failure."""
    resp = _get_client().chat.completions.create(
        model=_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    try:
        return json.loads(resp.choices[0].message.content)
    except (json.JSONDecodeError, KeyError):
        return {}
