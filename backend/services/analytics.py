"""
Analytics service for dashboard data aggregation and calculations.
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models.conversation import Conversation
from models.messages import Message
from models.leads import Lead
from models.users import User
from models.agent_config import AgentConfig

log = logging.getLogger(__name__)


def _pct_change(previous: int, current: int) -> float:
    """
    Calculate percentage change from previous to current.
    - previous=0, current=0  → 0.0   (no activity either month)
    - previous=0, current>0  → 100.0 (new activity this month vs zero baseline)
    - previous>0             → standard relative change
    """
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return ((current - previous) / previous) * 100


def get_conversation_metrics(user_id: int, db: Session) -> dict:
    """
    Calculate conversation metrics for current and previous month.
    Returns: {
        total_current_month: int,
        total_previous_month: int,
        percentage_change: float
    }
    """
    try:
        now = datetime.utcnow()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month_end = current_month_start - timedelta(days=1)
        previous_month_start = previous_month_end.replace(day=1)

        # Current month conversations
        current_conversations = db.query(Conversation).filter(
            and_(
                Conversation.user_id == user_id,
                Conversation.created_at >= current_month_start
            )
        ).all()
        current_count = len(current_conversations)

        # Previous month conversations
        previous_conversations = db.query(Conversation).filter(
            and_(
                Conversation.user_id == user_id,
                Conversation.created_at >= previous_month_start,
                Conversation.created_at < current_month_start
            )
        ).all()
        previous_count = len(previous_conversations)
    except Exception as e:
        log.error(f"Error calculating conversation metrics: {e}")
        current_count = 0
        previous_count = 0

    return {
        "total_current_month": current_count,
        "total_previous_month": previous_count,
        "percentage_change": round(_pct_change(previous_count, current_count), 2)
    }


def get_message_volume_metrics(user_id: int, db: Session) -> dict:
    """
    Calculate message volume metrics with daily breakdown for the current month.
    Returns: {
        daily_volumes: [{"date": "YYYY-MM-DD", "count": int}, ...],
        total_current_month: int,
        total_previous_month: int,
        percentage_change: float
    }
    """
    now = datetime.utcnow()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_month_end = current_month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)

    try:
        # Get all messages for current month
        current_messages = db.query(Message).join(
            Conversation, Conversation.id == Message.conversation_id
        ).filter(
            and_(
                Conversation.user_id == user_id,
                Message.created_at >= current_month_start
            )
        ).all()

        # Group by date in Python
        daily_volumes_dict = {}
        for msg in current_messages:
            date_key = msg.created_at.date()
            daily_volumes_dict[date_key] = daily_volumes_dict.get(date_key, 0) + 1

        daily_volumes = [
            {"date": str(date), "count": count}
            for date, count in sorted(daily_volumes_dict.items())
        ]

        current_total = len(current_messages)

        # Get previous month total
        previous_messages = db.query(Message).join(
            Conversation, Conversation.id == Message.conversation_id
        ).filter(
            and_(
                Conversation.user_id == user_id,
                Message.created_at >= previous_month_start,
                Message.created_at < current_month_start
            )
        ).all()

        previous_total = len(previous_messages)
    except Exception as e:
        log.error(f"Error calculating message volume metrics: {e}")
        daily_volumes = []
        current_total = 0
        previous_total = 0

    return {
        "daily_volumes": daily_volumes,
        "total_current_month": current_total,
        "total_previous_month": previous_total,
        "percentage_change": round(_pct_change(previous_total, current_total), 2)
    }


def get_lead_metrics(user_id: int, db: Session) -> dict:
    """
    Calculate lead generation metrics for current and previous month.
    Returns: {
        leads_generated: [{"date": "YYYY-MM-DD", "count": int}, ...],
        total_current_month: int,
        total_previous_month: int,
        percentage_change: float
    }
    """
    now = datetime.utcnow()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_month_end = current_month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)

    try:
        # Get all leads for current month
        current_leads = db.query(Lead).filter(
            and_(
                Lead.user_id == user_id,
                Lead.created_at >= current_month_start
            )
        ).all()

        # Group by date in Python
        daily_leads_dict = {}
        for lead in current_leads:
            date_key = lead.created_at.date()
            daily_leads_dict[date_key] = daily_leads_dict.get(date_key, 0) + 1

        leads_generated = [
            {"date": str(date), "count": count}
            for date, count in sorted(daily_leads_dict.items())
        ]

        current_total = len(current_leads)

        # Get previous month total
        previous_leads = db.query(Lead).filter(
            and_(
                Lead.user_id == user_id,
                Lead.created_at >= previous_month_start,
                Lead.created_at < current_month_start
            )
        ).all()

        previous_total = len(previous_leads)
    except Exception as e:
        log.error(f"Error calculating lead metrics: {e}")
        leads_generated = []
        current_total = 0
        previous_total = 0

    return {
        "leads_generated": leads_generated,
        "total_current_month": current_total,
        "total_previous_month": previous_total,
        "percentage_change": round(_pct_change(previous_total, current_total), 2)
    }


def get_weekly_message_volume(user_id: int, db: Session) -> list:
    """
    Calculate message volume by day of week.
    Returns: [{"day": "Monday", "volume": int}, ...]
    """
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekly_volumes = {day: 0 for day in days}

    try:
        # Get all messages for the user
        query = db.query(Message).join(
            Conversation, Conversation.id == Message.conversation_id
        ).filter(
            Conversation.user_id == user_id
        ).all()

        # Count messages by day of week
        for msg in query:
            day_idx = msg.created_at.weekday()  # 0=Monday, 6=Sunday
            day_name = days[day_idx]
            weekly_volumes[day_name] += 1
    except Exception as e:
        log.error(f"Error calculating weekly message volume: {e}")

    # Return in order
    return [{"day": day, "volume": weekly_volumes[day]} for day in days]


def get_lead_status_distribution(user_id: int, db: Session) -> list:
    """
    Calculate lead distribution by status.
    Returns: [{"status": "new", "count": int, "percentage": float}, ...]
    """
    try:
        # Get all leads for the user
        leads = db.query(Lead).filter(
            Lead.user_id == user_id
        ).all()

        # Count by status
        status_counts = {}
        for lead in leads:
            status = lead.status or "unknown"
            status_counts[status] = status_counts.get(status, 0) + 1

        total = sum(status_counts.values()) or 1  # Avoid division by zero

        result = []
        for status, count in sorted(status_counts.items()):
            percentage = (count / total) * 100 if total > 0 else 0
            result.append({
                "status": status,
                "count": count,
                "percentage": round(percentage, 2)
            })

        return result
    except Exception as e:
        log.error(f"Error calculating lead status distribution: {e}")
        return []


def get_agent_config(user_id: int, db: Session) -> dict:
    """
    Get the active agent configuration for the user.
    """
    try:
        config = db.query(AgentConfig).filter(
            and_(
                AgentConfig.user_id == user_id,
                AgentConfig.is_active == True
            )
        ).first()

        if not config:
            return {}

        return {
            "id": config.id,
            "system_prompt": config.system_prompt,
            "temperature": config.temperature,
            "greeting_message": config.greeting_message,
            "fallback_message": config.fallback_message,
            "enable_lead_qualification": config.enable_lead_qualification,
            "qualification_questions": config.qualification_questions,
            "is_active": config.is_active
        }
    except Exception as e:
        log.error(f"Error getting agent config: {e}")
        return {}


def get_all_dashboard_data(user_id: int, db: Session) -> dict:
    """
    Aggregate all dashboard data into a single response.
    """
    try:
        return {
            "conversations": get_conversation_metrics(user_id, db),
            "message_volume": get_message_volume_metrics(user_id, db),
            "leads": get_lead_metrics(user_id, db),
            "weekly_message_volume": get_weekly_message_volume(user_id, db),
            "lead_status_distribution": get_lead_status_distribution(user_id, db),
            "agent_config": get_agent_config(user_id, db)
        }
    except Exception as e:
        log.error(f"Error aggregating dashboard data for user {user_id}: {e}")
        # Return safe defaults
        return {
            "conversations": {"total_current_month": 0, "total_previous_month": 0, "percentage_change": 0},
            "message_volume": {"daily_volumes": [], "total_current_month": 0, "total_previous_month": 0, "percentage_change": 0},
            "leads": {"leads_generated": [], "total_current_month": 0, "total_previous_month": 0, "percentage_change": 0},
            "weekly_message_volume": [{"day": day, "volume": 0} for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]],
            "lead_status_distribution": [],
            "agent_config": {}
        }
