from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.users import User
from models.agent_config import AgentConfig
from schemas.agents import AgentConfigFull, UpdateAgentConfigRequest
from api.deps import get_current_user
import services.context_manager as ctx_mgr

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("/config", response_model=AgentConfigFull)
def get_agent_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = (
        db.query(AgentConfig)
        .filter(AgentConfig.user_id == current_user.id, AgentConfig.is_active == True)
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="No active agent config found.")
    return config


@router.patch("/config", response_model=AgentConfigFull)
def update_agent_config(
    payload: UpdateAgentConfigRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = (
        db.query(AgentConfig)
        .filter(AgentConfig.user_id == current_user.id, AgentConfig.is_active == True)
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="No active agent config found.")

    if payload.system_prompt is not None:
        config.system_prompt = payload.system_prompt
    if payload.temperature is not None:
        config.temperature = payload.temperature
    if payload.greeting_message is not None:
        config.greeting_message = payload.greeting_message
    if payload.fallback_message is not None:
        config.fallback_message = payload.fallback_message
    if payload.out_of_scope_message is not None:
        config.out_of_scope_message = payload.out_of_scope_message
    if payload.enable_lead_qualification is not None:
        config.enable_lead_qualification = payload.enable_lead_qualification
    if payload.strict_mode is not None:
        config.strict_mode = payload.strict_mode
    if payload.qualification_questions is not None:
        config.qualification_questions = payload.qualification_questions

    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)

    # Invalidate Redis cache so the agent picks up changes immediately
    ctx_mgr.invalidate_agent_config(current_user.id)

    return config
