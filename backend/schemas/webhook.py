from pydantic import BaseModel, Field


class WebhookPayload(BaseModel):
    from_number: str = Field(..., alias="from")   # "from" is a Python keyword
    content: str

    model_config = {"populate_by_name": True}


class WebhookResponse(BaseModel):
    reply: str
    conversation_id: int
