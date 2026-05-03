from pydantic import BaseModel, Field
from typing import Optional


class AgentConfigFull(BaseModel):
    id: int
    system_prompt: Optional[str]
    temperature: Optional[float]
    greeting_message: Optional[str]
    fallback_message: Optional[str]
    out_of_scope_message: Optional[str]
    enable_lead_qualification: Optional[bool]
    strict_mode: Optional[bool]
    qualification_questions: Optional[str]
    is_active: Optional[bool]

    model_config = {"from_attributes": True}


class UpdateAgentConfigRequest(BaseModel):
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0)
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None
    out_of_scope_message: Optional[str] = None
    enable_lead_qualification: Optional[bool] = None
    strict_mode: Optional[bool] = None
    qualification_questions: Optional[str] = None
