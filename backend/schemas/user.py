from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegisterRequest(BaseModel):
    id_token: str
    name: str
    phone_number: Optional[str] = None
    industry: str
    company_name: str
    company_size: str
    location: str
    website: Optional[str] = None
    services: Optional[str] = None
    description: Optional[str] = None


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None


class UpdateCompanyRequest(BaseModel):
    company_name: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    services: Optional[str] = None
    description: Optional[str] = None


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
    company_id: Optional[int]
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

class companyInfoResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    company_size: str
    location: str
    services: Optional[str]
    industry: str
    website: Optional[str]
    description: Optional[str]

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    agent_config: AgentConfigResponse
    company_info: companyInfoResponse

    model_config = {"from_attributes": True}