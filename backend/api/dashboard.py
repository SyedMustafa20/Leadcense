"""
Dashboard API endpoints - provides aggregated analytics and metrics data.
Protected endpoints - only authenticated users can access.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.database import get_db
from models.users import User
from schemas.dashboard import DashboardResponse
from services.analytics import get_all_dashboard_data
from api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
log = logging.getLogger(__name__)


@router.get("/metrics", response_model=DashboardResponse)
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all dashboard metrics and analytics data for the authenticated user.
    
    Returns:
    - Conversation metrics (current month vs previous month)
    - Message volume metrics with daily breakdown
    - Lead generation metrics with daily breakdown
    - Weekly message volume distribution
    - Lead status distribution
    - Active agent configuration
    """
    try:
        dashboard_data = get_all_dashboard_data(current_user.id, db)
        return DashboardResponse(**dashboard_data)
    except Exception as exc:
        log.error(f"Error fetching dashboard metrics for user {current_user.id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard metrics"
        )
