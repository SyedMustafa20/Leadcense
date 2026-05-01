"""
Redis-based fixed-window rate limiter.

Two independent scopes are checked on every inbound message:
  - CLIENT  scope: per (user_id, client_phone) — stops a single WhatsApp
                   number from flooding one business's agent.
  - BUSINESS scope: per user_id — protects the platform from a business
                    receiving an abnormal volume (bot farms, scraping).

Key layout:
  rl:c:{user_id}:{phone}:min   rl:c:{user_id}:{phone}:hr
  rl:b:{user_id}:min           rl:b:{user_id}:hr

Fixed-window chosen over sliding-window for simplicity and O(1) Redis ops.
Worst-case burst: 2× the per-minute limit at a window boundary — acceptable
for a WhatsApp chatbot where natural typing pace is the primary governor.
"""
import os
from dataclasses import dataclass
from dotenv import load_dotenv
from services.redis_client import get_redis

load_dotenv()

# ---------------------------------------------------------------------------
# Configurable limits (all read from .env with safe defaults)
# ---------------------------------------------------------------------------
_CLIENT_PER_MIN  = int(os.getenv("RATE_CLIENT_PER_MINUTE",   "10"))
_CLIENT_PER_HOUR = int(os.getenv("RATE_CLIENT_PER_HOUR",    "100"))
_BIZ_PER_MIN     = int(os.getenv("RATE_BUSINESS_PER_MINUTE", "300"))
_BIZ_PER_HOUR    = int(os.getenv("RATE_BUSINESS_PER_HOUR",  "5000"))

# Window durations in seconds
_MIN  = 60
_HOUR = 3_600


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after: int   # seconds until the limiting window resets (0 if allowed)
    scope: str         # "client_minute" | "client_hour" | "business_minute" | "business_hour"


def check(user_id: int, client_phone: str) -> RateLimitResult:
    """
    Run all four rate-limit checks atomically via a single Redis pipeline.
    Returns on the *first* exceeded limit — most restrictive wins.
    """
    r = get_redis()

    ck_min  = f"rl:c:{user_id}:{client_phone}:min"
    ck_hr   = f"rl:c:{user_id}:{client_phone}:hr"
    bk_min  = f"rl:b:{user_id}:min"
    bk_hr   = f"rl:b:{user_id}:hr"

    # Increment all four counters atomically, then read their TTLs.
    pipe = r.pipeline()
    for key in (ck_min, ck_hr, bk_min, bk_hr):
        pipe.incr(key)
    counts = pipe.execute()   # [c_min, c_hr, b_min, b_hr]

    # Set TTL only when a key was just created (count == 1).
    # Using a second pipeline keeps the number of round-trips to 2 total.
    pipe = r.pipeline()
    windows = (_MIN, _HOUR, _MIN, _HOUR)
    keys    = (ck_min, ck_hr, bk_min, bk_hr)
    for key, window, count in zip(keys, windows, counts):
        if count == 1:
            pipe.expire(key, window)
    pipe.execute()

    # Evaluate limits in priority order (tightest window first).
    checks = [
        (counts[0], _CLIENT_PER_MIN,  _MIN,  ck_min,  "client_minute"),
        (counts[2], _BIZ_PER_MIN,     _MIN,  bk_min,  "business_minute"),
        (counts[1], _CLIENT_PER_HOUR, _HOUR, ck_hr,   "client_hour"),
        (counts[3], _BIZ_PER_HOUR,    _HOUR, bk_hr,   "business_hour"),
    ]

    for count, limit, window, key, scope in checks:
        if count > limit:
            ttl = r.ttl(key)
            retry_after = max(ttl, 1)   # never return 0 for a blocked request
            return RateLimitResult(allowed=False, retry_after=retry_after, scope=scope)

    return RateLimitResult(allowed=True, retry_after=0, scope="")
