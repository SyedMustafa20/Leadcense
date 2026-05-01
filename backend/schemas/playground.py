from pydantic import BaseModel, Field
from typing import Optional


class PlaygroundMessage(BaseModel):
    content: str = Field(..., description="The message content from the client")
    client_name: Optional[str] = Field(None, description="Optional: name of the simulated client")


class PlaygroundResponse(BaseModel):
    reply: str = Field(..., description="The agent's response")
    conversation_id: int = Field(..., description="The conversation ID")
    client_id: int = Field(..., description="The simulated client ID")


class PlaygroundConversationHistory(BaseModel):
    conversation_id: int
    messages: list
