from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from datetime import datetime
from db.database import Base


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id = Column(Integer, primary_key=True, index=True)

    # Ownership (multi-tenant ready)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    company_id = Column(Integer, ForeignKey("company_info.id"), index=True)

    # === CORE AI SETTINGS ===
    system_prompt = Column(Text, nullable=True)
    temperature = Column(Float, nullable=True)
    intent_recognition_threshold = Column(Float, nullable=True)
    intents=Column(Text, nullable=True)  # JSON string of intent definitions

    # === BEHAVIOR CONTROL ===
    greeting_message = Column(Text, nullable=True)
    fallback_message = Column(Text, nullable=True)
    out_of_scope_message = Column(Text, nullable=True)

    # === TOOL CONTROL ===
    enable_order_lookup = Column(Boolean, nullable=True)
    enable_product_search = Column(Boolean, nullable=True)
    enable_lead_qualification = Column(Boolean, nullable=True)

    # === GUARDRAILS ===
    strict_mode = Column(Boolean, nullable=True)

    # === LEAD BOT SETTINGS ===
    qualification_questions = Column(Text, nullable=True)

    # === METADATA ===
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)