"""
Playground API endpoints - allows authenticated users to simulate client interactions.
Clients simulate sending messages, and the agent workflow processes them.
Protected endpoints - only authenticated users can access.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.database import get_db
from models.users import User
from models.clients import Client
from models.conversation import Conversation
from models.messages import Message
from schemas.playground import PlaygroundMessage, PlaygroundResponse
from services.agent import handle_message
from api.deps import get_current_user

router = APIRouter(prefix="/playground", tags=["Playground"])
log = logging.getLogger(__name__)


def _get_or_create_playground_client(user_id: int, client_name: str, db: Session) -> Client:
    """
    Get or create a playground test client for the user.
    Uses a special naming convention: "playground_test_{index}"
    """
    # First, try to find an existing playground test client
    client = db.query(Client).filter(
        Client.user_id == user_id,
        Client.name.like("playground_test_%")
    ).first()

    if not client:
        # Create a new playground client
        client_name = client_name or f"Playground Client"
        client = Client(
            user_id=user_id,
            name=f"playground_test_{client_name}",
            phone_number="+playground0000000000"  # Fake phone for test purposes
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        log.info(f"Created playground client {client.id} for user {user_id}")

    return client


@router.post("/message", response_model=PlaygroundResponse)
def send_playground_message(
    payload: PlaygroundMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message to the playground agent.
    
    This endpoint simulates a client sending a message to the authenticated user's agent.
    The message is processed through the full agent workflow (sanitization, guardrails, LLM).
    
    Args:
    - content: The message content from the simulated client
    - client_name: Optional name for the test client (default: "Playground Client")
    
    Returns:
    - reply: The agent's response
    - conversation_id: The conversation ID for tracking
    - client_id: The test client ID
    """
    try:
        # Get or create a playground test client
        client = _get_or_create_playground_client(
            current_user.id,
            payload.client_name or "Playground Client",
            db
        )

        # Process the message through the agent
        reply, conversation_id = handle_message(
            user_id=current_user.id,
            client_phone=client.phone_number,
            content=payload.content,
            db=db
        )

        return PlaygroundResponse(
            reply=reply,
            conversation_id=conversation_id,
            client_id=client.id
        )

    except Exception as exc:
        log.error(f"Error in playground message for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process playground message"
        )


@router.get("/conversation/{conversation_id}")
def get_playground_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the full conversation history for a playground conversation.
    
    Returns the conversation details and all messages in chronological order.
    """
    try:
        # Verify the conversation belongs to this user
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Get all messages for this conversation
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()

        messages_data = [
            {
                "id": msg.id,
                "sender_type": msg.sender_type,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]

        return {
            "conversation_id": conversation.id,
            "messages": messages_data,
            "summary": conversation.conversation_summary
        }

    except HTTPException:
        raise
    except Exception as exc:
        log.error(f"Error fetching conversation {conversation_id} for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversation"
        )


@router.delete("/conversation/{conversation_id}")
def delete_playground_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a playground conversation and its messages.
    Useful for clearing test conversations.
    """
    try:
        # Verify the conversation belongs to this user
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Delete all messages for this conversation
        db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).delete()

        # Delete the conversation
        db.delete(conversation)
        db.commit()

        return {"status": "success", "message": "Conversation deleted"}

    except HTTPException:
        raise
    except Exception as exc:
        log.error(f"Error deleting conversation {conversation_id} for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )
