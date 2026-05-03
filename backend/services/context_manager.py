import json
import os
import time
from dotenv import load_dotenv
from services.redis_client import get_redis

load_dotenv()

# Redis key templates
_CTX_KEY        = "ctx:{conv_id}"          # full conversation context
_CONV_MAP_KEY   = "conv_map:{uid}:{phone}"  # phone → {conversation_id, client_id, last_activity_ts}
_AGENT_CFG_KEY  = "agent_cfg:{uid}"         # cached agent config
_COMPANY_KEY    = "company_info:{uid}"      # cached company info

# Sliding window: keep this many recent messages in Redis
_MAX_MESSAGES = 10

# Inactivity gap after which a new conversation is started (seconds)
SESSION_TIMEOUT_SECS: int = int(os.getenv("CONVERSATION_TIMEOUT_HOURS", "24")) * 3_600

# TTL for the conv_map key — kept well above the session timeout so expiry
# never masks the "gap detected" logic; the timeout check is explicit.
_CONV_MAP_TTL  = SESSION_TIMEOUT_SECS * 3
_CTX_TTL       = SESSION_TIMEOUT_SECS * 3
_CFG_TTL       = 3_600


# ---------------------------------------------------------------------------
# Conversation map (phone → IDs)
# ---------------------------------------------------------------------------

def get_session_ids(user_id: int, client_phone: str) -> dict | None:
    """Return {"conversation_id": int, "client_id": int, "last_activity_ts": float} or None."""
    r = get_redis()
    raw = r.get(_CONV_MAP_KEY.format(uid=user_id, phone=client_phone))
    if raw:
        return json.loads(raw)
    return None


def set_session_ids(user_id: int, client_phone: str, conversation_id: int, client_id: int) -> None:
    r = get_redis()
    r.setex(
        _CONV_MAP_KEY.format(uid=user_id, phone=client_phone),
        _CONV_MAP_TTL,
        json.dumps({
            "conversation_id": conversation_id,
            "client_id": client_id,
            "last_activity_ts": time.time(),
        }),
    )


def is_session_expired(cached: dict) -> bool:
    """Return True if the gap since the last message exceeds SESSION_TIMEOUT_SECS."""
    last_ts = cached.get("last_activity_ts")
    if last_ts is None:
        return True
    return (time.time() - float(last_ts)) > SESSION_TIMEOUT_SECS


def touch_session(user_id: int, client_phone: str, conversation_id: int, client_id: int) -> None:
    """Refresh the last_activity_ts for an active session without changing the IDs."""
    set_session_ids(user_id, client_phone, conversation_id, client_id)


# ---------------------------------------------------------------------------
# Agent config cache
# ---------------------------------------------------------------------------

def get_cached_agent_config(user_id: int) -> dict | None:
    r = get_redis()
    raw = r.get(_AGENT_CFG_KEY.format(uid=user_id))
    if raw:
        return json.loads(raw)
    return None


def cache_agent_config(user_id: int, config_dict: dict) -> None:
    r = get_redis()
    r.setex(_AGENT_CFG_KEY.format(uid=user_id), _CFG_TTL, json.dumps(config_dict))


def invalidate_agent_config(user_id: int) -> None:
    get_redis().delete(_AGENT_CFG_KEY.format(uid=user_id))


# ---------------------------------------------------------------------------
# Company info cache
# ---------------------------------------------------------------------------

def get_cached_company_info(user_id: int) -> dict | None:
    r = get_redis()
    raw = r.get(_COMPANY_KEY.format(uid=user_id))
    return json.loads(raw) if raw else None


def cache_company_info(user_id: int, company_dict: dict) -> None:
    get_redis().setex(_COMPANY_KEY.format(uid=user_id), _CFG_TTL, json.dumps(company_dict))


def invalidate_company_cache(user_id: int) -> None:
    get_redis().delete(_COMPANY_KEY.format(uid=user_id))


# ---------------------------------------------------------------------------
# Conversation context
# ---------------------------------------------------------------------------

def get_context(conversation_id: int) -> dict | None:
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    if raw:
        return json.loads(raw)
    return None


def init_context(conversation_id: int, client_id: int) -> dict:
    """Create a fresh context for a brand-new conversation."""
    ctx = {
        "messages": [],
        "summary": "",
        "phase": "greeting",
        "q_state": {
            "pending_fields": [],   # populated after first message with required question fields
            "answered": {},         # field_name → collected value
        },
        "message_count": 0,
        "client_id": client_id,
        "conversation_id": conversation_id,
        "active_lead_id": None,     # set by background task once a Lead row is created/found
        "meeting_confirmed": False, # True once the agent has sent the meeting/calendar confirmation
    }
    _save_context(conversation_id, ctx)
    return ctx


def set_meeting_confirmed(conversation_id: int) -> None:
    """Mark the conversation as concluded — agent has confirmed the meeting."""
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    if not raw:
        return
    ctx = json.loads(raw)
    ctx["meeting_confirmed"] = True
    ctx["phase"] = "closed"
    _save_context(conversation_id, ctx)


def update_active_lead(conversation_id: int, lead_id: int) -> None:
    """Called by the Celery worker once it resolves the Lead row for this conversation."""
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    if not raw:
        return
    ctx = json.loads(raw)
    ctx["active_lead_id"] = lead_id
    _save_context(conversation_id, ctx)


def add_message_pair(conversation_id: int, user_content: str, agent_content: str) -> int:
    """
    Append a user+agent message pair to the context.
    Trims to the sliding window. Returns the new total message count.
    """
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    ctx: dict = json.loads(raw) if raw else {"messages": [], "summary": "", "phase": "open",
                                              "q_state": {"pending_fields": [], "answered": {}},
                                              "message_count": 0}

    ctx["messages"].append({"role": "user",      "content": user_content})
    ctx["messages"].append({"role": "assistant", "content": agent_content})

    # Keep sliding window
    if len(ctx["messages"]) > _MAX_MESSAGES:
        ctx["messages"] = ctx["messages"][-_MAX_MESSAGES:]

    ctx["message_count"] = ctx.get("message_count", 0) + 1
    _save_context(conversation_id, ctx)
    return ctx["message_count"]


def update_summary(conversation_id: int, new_summary: str) -> None:
    """Store the new compressed summary and trim message window to last 2 pairs."""
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    if not raw:
        return
    ctx = json.loads(raw)
    ctx["summary"] = new_summary
    # Keep only the 4 most recent messages after a summary is created
    ctx["messages"] = ctx["messages"][-4:]
    _save_context(conversation_id, ctx)


def update_phase(conversation_id: int, phase: str) -> None:
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    if not raw:
        return
    ctx = json.loads(raw)
    ctx["phase"] = phase
    _save_context(conversation_id, ctx)


def update_q_state(conversation_id: int, answered: dict, pending_fields: list[str]) -> None:
    r = get_redis()
    raw = r.get(_CTX_KEY.format(conv_id=conversation_id))
    if not raw:
        return
    ctx = json.loads(raw)
    ctx["q_state"]["answered"].update(answered)
    ctx["q_state"]["pending_fields"] = pending_fields
    _save_context(conversation_id, ctx)


def _save_context(conversation_id: int, ctx: dict) -> None:
    get_redis().setex(
        _CTX_KEY.format(conv_id=conversation_id),
        _CTX_TTL,
        json.dumps(ctx),
    )
