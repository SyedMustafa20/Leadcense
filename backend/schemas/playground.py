from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PlaygroundMessage(BaseModel):
    content: str = Field(..., description="Message content from the simulated client")
    client_id: Optional[int] = Field(None, description="Existing playground client ID; omit to create a new one")


class PlaygroundResponse(BaseModel):
    reply: str
    conversation_id: int
    client_id: int


class PlaygroundSession(BaseModel):
    client_id: int
    client_name: str
    conversation_id: Optional[int] = None
    message_count: int
    created_at: datetime


class PlaygroundSessionsResponse(BaseModel):
    sessions: List[PlaygroundSession]
