from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from db.database import Base
from datetime import datetime

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))  # Foreign key to Conversation
    sender_type = Column(String)  # 'user' or 'client'
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)