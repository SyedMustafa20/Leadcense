from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError

from db.database import get_db
from models.users import User
from models.agent_config import AgentConfig
from models.company_info import CompanyInfo
from schemas.user import UserRegisterRequest, RegisterResponse
from services.agent_config_service import create_agent_config
from services.firebase import verify_id_token
from api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):

    # --- Verify Firebase ID token ---
    try:
        decoded_token = verify_id_token(payload.id_token)
    except ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase ID token has expired.")
    except RevokedIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase ID token has been revoked.")
    except InvalidIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase ID token.")

    firebase_uid: str = decoded_token["uid"]
    email: str = decoded_token.get("email", "")

    # --- Check for existing user ---
    duplicate = (
        db.query(User)
        .filter((User.firebase_uid == firebase_uid) | (User.email == email))
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or Firebase UID already exists.",
        )

    # --- Create user ---
    new_user = User(
        firebase_uid=firebase_uid,
        name=payload.name,
        email=email,
        phone_number=payload.phone_number,
        industry=payload.industry,
    )
    db.add(new_user)
    db.flush()  # get new_user.id

    # --- Create company info FIRST ---
    company_info = CompanyInfo(
        user_id=new_user.id,
        company_name=payload.company_name,
        company_size=payload.company_size,
        location=payload.location,
        services=payload.services,
        industry=payload.industry,
        description=payload.description,
    )
    db.add(company_info)
    db.flush()  # get company_info.id

    # --- Create agent config WITH company_id ---
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

    return RegisterResponse(
        user=new_user,
        agent_config=agent_config,
        company_info=company_info
    )

@router.get("/me", response_model=RegisterResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 🔹 1. Get active agent config
    agent_config = (
        db.query(AgentConfig)
        .filter(
            AgentConfig.user_id == current_user.id,
            AgentConfig.is_active == True
        )
        .first()
    )

    if not agent_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent config not found for this user.",
        )

    # 🔹 2. Get company info
    company_info = (
        db.query(CompanyInfo)
        .filter(CompanyInfo.user_id == current_user.id)
        .first()
    )

    if not company_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company info not found for this user.",
        )

    # 🔹 3. Return structured response
    return RegisterResponse(
        user=current_user,
        agent_config=agent_config,
        company_info=company_info
    )

@router.delete("/delete/me")
def delete_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    db.delete(user)
    db.commit()

    return {"detail": "User account deleted successfully."}