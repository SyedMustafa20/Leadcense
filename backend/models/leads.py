from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from datetime import datetime
from db.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Relationships
    # Conversations are linked via the lead_conversations junction table.
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    user_id   = Column(Integer, ForeignKey("users.id"),   index=True)

    # Basic Info
    name = Column(String, index=True, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

    # 🔹 RAW DATA (very important)
    raw_input = Column(Text, nullable=True)  
    # Full user messages combined (original source of truth)

    # 🔹 AI SUMMARIZED DATA
    summary = Column(Text, nullable=True)  
    # Clean, human-readable summary of lead

    # 🔹 STRUCTURED FIELDS (for filtering)
    requirement = Column(Text, nullable=True)
    budget = Column(String, nullable=True)
    timeline = Column(String, nullable=True)
    location = Column(String, nullable=True)

    # 🔹 Qualification
    status = Column(String, default="new")   # new, contacted, closed
    tag = Column(String, nullable=True)      # hot, warm, cold
    score = Column(Integer, default=0)       # optional scoring

    # 🔹 Metadata
    source = Column(String, default="whatsapp")
    notes = Column(Text, nullable=True)

    # 🔹 Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)