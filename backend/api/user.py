from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError

from db.database import get_db
from models.users import User
from models.agent_config import AgentConfig
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
    db.flush()  # assigns new_user.id without committing

    # --- Create tailored agent config ---
    agent_config = create_agent_config(
        user_id=new_user.id,
        industry=payload.industry,
    )
    db.add(agent_config)
    db.commit()

    db.refresh(new_user)
    db.refresh(agent_config)

    return RegisterResponse(user=new_user, agent_config=agent_config)


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent config not found for this user.",
        )
    return RegisterResponse(user=current_user, agent_config=agent_config)


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