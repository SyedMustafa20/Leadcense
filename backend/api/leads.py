import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from db.database import get_db
from models.users import User
from models.leads import Lead
from models.clients import Client
from models.conversation import Conversation
from models.messages import Message
from models.lead_conversation import LeadConversation
from schemas.leads import (
    LeadsListResponse, LeadDetailResponse, LeadListItem,
    LeadStats, UpdateStatusRequest, UpdateNotesRequest,
    ClientInfo, ConversationItem, MessageItem,
)
from api.deps import get_current_user

router = APIRouter(prefix="/leads", tags=["Leads"])
log = logging.getLogger(__name__)

VALID_STATUSES = {"new", "contacted", "qualified", "unqualified", "closed"}


@router.get("", response_model=LeadsListResponse)
def list_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Lead).filter(Lead.user_id == current_user.id)

    if status:
        q = q.filter(Lead.status == status)
    if tag:
        q = q.filter(Lead.tag == tag)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                Lead.name.ilike(term),
                Lead.email.ilike(term),
                Lead.requirement.ilike(term),
            )
        )

    total = q.count()
    leads = q.order_by(Lead.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    all_q = db.query(Lead).filter(Lead.user_id == current_user.id)
    total_all   = all_q.count()
    hot_count   = all_q.filter(Lead.tag == "hot").count()
    warm_count  = all_q.filter(Lead.tag == "warm").count()
    cold_count  = all_q.filter(Lead.tag == "cold").count()
    untagged    = total_all - hot_count - warm_count - cold_count

    return LeadsListResponse(
        leads=leads,
        total=total,
        page=page,
        per_page=per_page,
        stats=LeadStats(
            total=total_all,
            hot=hot_count,
            warm=warm_count,
            cold=cold_count,
            untagged=untagged,
        ),
    )


@router.get("/{lead_id}", response_model=LeadDetailResponse)
def get_lead_detail(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    client = db.query(Client).filter(Client.id == lead.client_id).first()

    conv_ids = [
        row.conversation_id
        for row in db.query(LeadConversation)
        .filter(LeadConversation.lead_id == lead_id)
        .all()
    ]

    conversations = []
    for conv in (
        db.query(Conversation)
        .filter(Conversation.id.in_(conv_ids))
        .order_by(Conversation.created_at.asc())
        .all()
    ):
        msgs = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.asc())
            .all()
        )
        conversations.append(
            ConversationItem(
                id=conv.id,
                summary=conv.conversation_summary,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                messages=[
                    MessageItem(
                        id=m.id,
                        sender_type=m.sender_type,
                        content=m.content,
                        created_at=m.created_at,
                    )
                    for m in msgs
                ],
            )
        )

    client_info = None
    if client:
        client_info = ClientInfo(
            id=client.id,
            name=client.name,
            phone_number=client.phone_number,
            created_at=client.created_at,
        )

    return LeadDetailResponse(lead=lead, client=client_info, conversations=conversations)


@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    payload: UpdateStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(sorted(VALID_STATUSES))}",
        )
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    lead.status = payload.status
    lead.updated_at = datetime.utcnow()
    db.commit()
    return {"id": lead.id, "status": lead.status}


@router.patch("/{lead_id}/notes")
def update_lead_notes(
    lead_id: int,
    payload: UpdateNotesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    lead.notes = payload.notes
    lead.updated_at = datetime.utcnow()
    db.commit()
    return {"id": lead.id, "notes": lead.notes}
