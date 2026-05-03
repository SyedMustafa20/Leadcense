from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.users import User
from models.conversation import Conversation
from models.messages import Message
from models.clients import Client
from api.deps import get_current_user

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("")
def list_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Conversation, Client)
        .join(Client, Conversation.client_id == Client.id)
        .filter(Conversation.user_id == current_user.id)
    )
    if search:
        q = q.filter(Client.name.ilike(f"%{search}%"))

    total = q.count()
    rows = (
        q.order_by(Conversation.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    result = []
    for conv, client in rows:
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        msg_count = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .count()
        )
        result.append({
            "id": conv.id,
            "client_id": client.id,
            "client_name": client.name or "Unknown",
            "client_phone": client.phone_number,
            "last_message": last_msg.content if last_msg else None,
            "last_message_time": (
                last_msg.created_at.isoformat() if last_msg
                else conv.updated_at.isoformat()
            ),
            "message_count": msg_count,
            "conversation_summary": conv.conversation_summary,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
        })

    return {"conversations": result, "total": total}


@router.get("/{conversation_id}")
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    client = db.query(Client).filter(Client.id == conv.client_id).first()
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "id": conv.id,
        "client_id": conv.client_id,
        "client_name": client.name if client else "Unknown",
        "client_phone": client.phone_number if client else None,
        "conversation_summary": conv.conversation_summary,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
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
