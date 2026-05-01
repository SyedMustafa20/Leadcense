import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.database import get_db
from models.users import User
from schemas.webhook import WebhookPayload, WebhookResponse
from services.agent import handle_message
from services.rate_limiter import check as rate_limit_check

router = APIRouter(prefix="/webhook", tags=["Webhook"])
log = logging.getLogger(__name__)


@router.post("/{user_id}", response_model=WebhookResponse)
def receive_message(
    user_id: int,
    payload: WebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Simulated WhatsApp webhook. In production this URL is registered with
    the WhatsApp Business API for the given business user.

    Payload:
        from    — sender's phone number (e.g. "+971501234567")
        content — message text
    """
    # ── 1. Rate limiting (Redis, before any DB or LLM work) ───────────────
    rl = rate_limit_check(user_id, payload.from_number)
    if not rl.allowed:
        log.warning(
            "Rate limit hit | user_id=%s phone=%s scope=%s retry_after=%ss",
            user_id, payload.from_number, rl.scope, rl.retry_after,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many messages. Please wait a moment before sending again.",
            headers={"Retry-After": str(rl.retry_after)},
        )

    # ── 2. Verify the business user exists ────────────────────────────────
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No business account found for user_id={user_id}.",
        )

    # ── 3. Hand off to agent ──────────────────────────────────────────────
    reply, conversation_id = handle_message(
        user_id=user_id,
        client_phone=payload.from_number,
        content=payload.content,
        db=db,
    )

    return WebhookResponse(reply=reply, conversation_id=conversation_id)
