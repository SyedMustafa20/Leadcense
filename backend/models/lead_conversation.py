from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from datetime import datetime
from db.database import Base


class LeadConversation(Base):
    """Junction table — a lead can span multiple conversations, and a
    conversation can contain multiple distinct leads."""
    __tablename__ = "lead_conversations"

    id              = Column(Integer, primary_key=True, index=True)
    lead_id         = Column(Integer, ForeignKey("leads.id"),         nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("lead_id", "conversation_id", name="uq_lead_conversation"),
    )
