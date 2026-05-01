from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class LeadListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    requirement: Optional[str] = None
    budget: Optional[str] = None
    timeline: Optional[str] = None
    location: Optional[str] = None
    status: str
    tag: Optional[str] = None
    score: Optional[int] = None
    source: str
    notes: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class LeadStats(BaseModel):
    total: int
    hot: int
    warm: int
    cold: int
    untagged: int


class LeadsListResponse(BaseModel):
    leads: List[LeadListItem]
    total: int
    page: int
    per_page: int
    stats: LeadStats


class MessageItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    sender_type: str
    content: str
    created_at: datetime


class ConversationItem(BaseModel):
    id: int
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[MessageItem]


class ClientInfo(BaseModel):
    id: int
    name: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: datetime


class LeadDetailResponse(BaseModel):
    lead: LeadListItem
    client: Optional[ClientInfo] = None
    conversations: List[ConversationItem]


class UpdateStatusRequest(BaseModel):
    status: str


class UpdateNotesRequest(BaseModel):
    notes: str
