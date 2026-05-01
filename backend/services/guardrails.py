import json
import re
from dataclasses import dataclass
from models.agent_config import AgentConfig


@dataclass
class GuardrailResult:
    passed: bool
    response: str | None  # pre-built response to return if not passed


def _keyword_matches_any_intent(content: str, intents_json: str | None) -> bool:
    """Return True if the message content matches at least one defined intent keyword."""
    if not intents_json:
        return True  # no intents configured → allow everything through
    try:
        intents: list[dict] = json.loads(intents_json)
    except (json.JSONDecodeError, TypeError):
        return True

    lowered = content.lower()
    for intent in intents:
        for kw in intent.get("keywords", []):
            if kw.lower() in lowered:
                return True
    return False


def _is_repetitive(content: str, recent_messages: list[dict]) -> bool:
    """Detect if the user is sending the same message repeatedly (loop attack)."""
    if len(recent_messages) < 4:
        return False
    user_msgs = [m["content"].strip().lower() for m in recent_messages if m["role"] == "user"]
    if not user_msgs:
        return False
    # If the last 3 user messages are identical → repetitive
    return len(set(user_msgs[-3:])) == 1 and user_msgs[-1] == content.strip().lower()


def check(
    content: str,
    context: dict,
    agent_cfg: AgentConfig,
) -> GuardrailResult:
    """
    Apply all guardrails based on the agent's configuration.
    Must be called AFTER sanitization.
    """
    recent_messages: list[dict] = context.get("messages", [])

    # 1. Repetitive message loop detection
    if _is_repetitive(content, recent_messages):
        return GuardrailResult(
            passed=False,
            response=(
                "It looks like you may have sent the same message a few times. "
                "Could you let me know what you need help with? I'm here to assist."
            ),
        )

    # 2. Strict mode: enforce topic scope via intent keyword matching
    if agent_cfg.strict_mode:
        # Short messages (greetings, acknowledgements) always pass
        if len(content.split()) > 5 and not _keyword_matches_any_intent(content, agent_cfg.intents):
            return GuardrailResult(
                passed=False,
                response=agent_cfg.out_of_scope_message or (
                    "I'm only able to assist with topics related to our services. "
                    "Could you let me know how I can help you within that scope?"
                ),
            )

    # 3. Minimum content guard — single character / whitespace only
    if not content.strip() or re.fullmatch(r"[\W_]+", content.strip()):
        return GuardrailResult(
            passed=False,
            response="I didn't quite catch that — could you tell me more about what you're looking for?",
        )

    return GuardrailResult(passed=True, response=None)
