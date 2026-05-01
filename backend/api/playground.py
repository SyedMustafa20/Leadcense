"""
Playground API — authenticated users simulate multiple independent test clients.
Each test client gets a unique phone number so Redis conversation contexts are isolated.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.users import User
from models.clients import Client
from models.conversation import Conversation
from models.messages import Message
from models.lead_conversation import LeadConversation
from schemas.playground import (
    PlaygroundMessage, PlaygroundResponse,
    PlaygroundSession, PlaygroundSessionsResponse,
)
from services.agent import handle_message
from api.deps import get_current_user

router = APIRouter(prefix="/playground", tags=["Playground"])
log = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _resolve_playground_client(
    user_id: int,
    client_id: Optional[int],
    db: Session,
) -> Client:
    """
    Return an existing playground client (when client_id is given) or create a
    brand-new one.  Every client gets a unique phone so Redis contexts stay isolated.
    """
    if client_id is not None:
        client = db.query(Client).filter(
            Client.id == client_id,
            Client.user_id == user_id,
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Playground client not found.")
        return client

    # Count existing playground clients so we can assign a sequential label
    count = db.query(Client).filter(
        Client.user_id == user_id,
        Client.name.like("playground%"),
    ).count()

    seq = count + 1
    client = Client(
        user_id=user_id,
        name=f"playground_client_{seq}",
        phone_number=f"+pg{user_id:04d}{seq:06d}",
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    log.info("Created playground client %s (seq=%s) for user %s", client.id, seq, user_id)
    return client


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=PlaygroundSessionsResponse)
def list_playground_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all playground test clients for the authenticated user, oldest first."""
    clients = (
        db.query(Client)
        .filter(
            Client.user_id == current_user.id,
            Client.name.like("playground%"),
        )
        .order_by(Client.created_at.asc())
        .all()
    )

    sessions = []
    for client in clients:
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.client_id == client.id,
                Conversation.user_id == current_user.id,
            )
            .order_by(Conversation.created_at.desc())
            .first()
        )
        msg_count = 0
        conv_id   = None
        if conv:
            conv_id   = conv.id
            msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()

        sessions.append(
            PlaygroundSession(
                client_id=client.id,
                client_name=client.name,
                conversation_id=conv_id,
                message_count=msg_count,
                created_at=client.created_at,
            )
        )

    return PlaygroundSessionsResponse(sessions=sessions)


@router.post("/message", response_model=PlaygroundResponse)
def send_playground_message(
    payload: PlaygroundMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message through the agent pipeline as a specific (or new) test client.
    Pass client_id to continue an existing test session; omit it to start a fresh one.
    """
    try:
        client = _resolve_playground_client(current_user.id, payload.client_id, db)

        reply, conversation_id = handle_message(
            user_id=current_user.id,
            client_phone=client.phone_number,
            content=payload.content,
            db=db,
        )

        return PlaygroundResponse(
            reply=reply,
            conversation_id=conversation_id,
            client_id=client.id,
        )

    except HTTPException:
        raise
    except Exception as exc:
        log.error("Playground message error for user %s: %s", current_user.id, exc)
        raise HTTPException(status_code=500, detail="Failed to process message")


@router.get("/conversation/{conversation_id}")
def get_playground_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a conversation and all its messages."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    return {
        "conversation_id": conv.id,
        "summary": conv.conversation_summary,
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.delete("/session/{client_id}")
def delete_playground_session(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a test client and all its conversations and messages."""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.user_id == current_user.id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Playground client not found.")

    convs = db.query(Conversation).filter(
        Conversation.client_id == client_id,
        Conversation.user_id == current_user.id,
    ).all()

    for conv in convs:
        db.query(Message).filter(Message.conversation_id == conv.id).delete()
        db.query(LeadConversation).filter(LeadConversation.conversation_id == conv.id).delete()
        db.delete(conv)

    db.delete(client)
    db.commit()
    return {"status": "deleted", "client_id": client_id}
