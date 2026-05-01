from pydantic import BaseModel
from typing import List, Optional


class ConversationMetric(BaseModel):
    total_current_month: int
    total_previous_month: int
    percentage_change: float


class MessageVolumeData(BaseModel):
    date: str
    count: int


class MessageVolumeMetrics(BaseModel):
    daily_volumes: List[MessageVolumeData]
    total_current_month: int
    total_previous_month: int
    percentage_change: float


class LeadMetric(BaseModel):
    date: str
    count: int


class LeadMetrics(BaseModel):
    leads_generated: List[LeadMetric]
    total_current_month: int
    total_previous_month: int
    percentage_change: float


class WeeklyMessageVolume(BaseModel):
    day: str
    volume: int


class LeadStatusDistribution(BaseModel):
    status: str
    count: int
    percentage: float


class AgentConfigData(BaseModel):
    id:                        Optional[int]   = None
    system_prompt:             Optional[str]   = None
    temperature:               Optional[float] = None
    greeting_message:          Optional[str]   = None
    fallback_message:          Optional[str]   = None
    enable_lead_qualification: Optional[bool]  = None
    qualification_questions:   Optional[str]   = None
    is_active:                 Optional[bool]  = None


class DashboardResponse(BaseModel):
    conversations:            ConversationMetric
    message_volume:           MessageVolumeMetrics
    leads:                    LeadMetrics
    weekly_message_volume:    List[WeeklyMessageVolume]
    lead_status_distribution: List[LeadStatusDistribution]
    agent_config:             Optional[AgentConfigData] = None
