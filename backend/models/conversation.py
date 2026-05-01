from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime
from db.database import Base
from models.users import User
from models.clients import Client

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # Foreign key to User
    client_id = Column(Integer, ForeignKey("clients.id"))  # Foreign key to Client
    conversation_summary = Column(String)  # Store conversation summary
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)