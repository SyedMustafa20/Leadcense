from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegisterRequest(BaseModel):
    id_token: str           # Firebase ID token from the frontend (verified server-side)
    name: str
    phone_number: Optional[str] = None
    industry: str


class UserResponse(BaseModel):
    id: int
    firebase_uid: str
    name: str
    email: str
    phone_number: Optional[str]
    industry: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentConfigResponse(BaseModel):
    id: int
    user_id: int
    system_prompt: Optional[str]
    temperature: Optional[float]
    intent_recognition_threshold: Optional[float]
    intents: Optional[str]
    greeting_message: Optional[str]
    fallback_message: Optional[str]
    out_of_scope_message: Optional[str]
    enable_order_lookup: Optional[bool]
    enable_product_search: Optional[bool]
    enable_lead_qualification: Optional[bool]
    strict_mode: Optional[bool]
    qualification_questions: Optional[str]
    is_active: Optional[bool]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    agent_config: AgentConfigResponse
