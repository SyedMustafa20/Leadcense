from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError

from db.database import get_db
from models.users import User
from models.agent_config import AgentConfig
from models.company_info import CompanyInfo
from schemas.user import (
    UserRegisterRequest, RegisterResponse,
    UpdateUserRequest, UpdateCompanyRequest,
)
from services.agent_config_service import create_agent_config
from services.firebase import verify_id_token
from api.deps import get_current_user
import services.context_manager as ctx_mgr

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    try:
        decoded_token = verify_id_token(payload.id_token)
    except ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Firebase ID token has expired.")
    except RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Firebase ID token has been revoked.")
    except InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token.")

    firebase_uid: str = decoded_token["uid"]
    email: str = decoded_token.get("email", "")

    duplicate = (
        db.query(User)
        .filter((User.firebase_uid == firebase_uid) | (User.email == email))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="A user with this email or Firebase UID already exists.")

    new_user = User(
        firebase_uid=firebase_uid,
        name=payload.name,
        email=email,
        phone_number=payload.phone_number,
        industry=payload.industry,
    )
    db.add(new_user)
    db.flush()

    company_info = CompanyInfo(
        user_id=new_user.id,
        company_name=payload.company_name,
        company_size=payload.company_size,
        location=payload.location,
        website=payload.website,
        services=payload.services,
        industry=payload.industry,
        description=payload.description,
    )
    db.add(company_info)
    db.flush()

    agent_config = create_agent_config(
        user_id=new_user.id,
        company_id=company_info.id,
        industry=payload.industry,
    )
    db.add(agent_config)
    db.commit()

    db.refresh(new_user)
    db.refresh(company_info)
    db.refresh(agent_config)

    return RegisterResponse(user=new_user, agent_config=agent_config, company_info=company_info)


@router.get("/me", response_model=RegisterResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agent_config = (
        db.query(AgentConfig)
        .filter(AgentConfig.user_id == current_user.id, AgentConfig.is_active == True)
        .first()
    )
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent config not found for this user.")

    company_info = db.query(CompanyInfo).filter(CompanyInfo.user_id == current_user.id).first()
    if not company_info:
        raise HTTPException(status_code=404, detail="Company info not found for this user.")

    return RegisterResponse(user=current_user, agent_config=agent_config, company_info=company_info)


@router.patch("/me")
def update_user(
    payload: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name.strip()
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return {"id": current_user.id, "name": current_user.name}


@router.patch("/company/me")
def update_company(
    payload: UpdateCompanyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(CompanyInfo).filter(CompanyInfo.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company info not found.")

    if payload.company_name is not None:
        company.company_name = payload.company_name.strip()
    if payload.company_size is not None:
        company.company_size = payload.company_size
    if payload.location is not None:
        company.location = payload.location.strip()
    if payload.website is not None:
        company.website = payload.website.strip() or None
    if payload.services is not None:
        company.services = payload.services.strip() or None
    if payload.description is not None:
        company.description = payload.description.strip() or None

    db.commit()
    db.refresh(company)

    # Invalidate cached company info so agent picks up changes immediately
    ctx_mgr.invalidate_company_cache(current_user.id)

    return {
        "id": company.id,
        "company_name": company.company_name,
        "company_size": company.company_size,
        "location": company.location,
        "website": company.website,
        "services": company.services,
        "description": company.description,
    }


@router.delete("/delete/me")
def delete_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete: marks account inactive. Only a DB admin can reactivate it."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"detail": "Account deactivated. Contact support to reactivate."}
