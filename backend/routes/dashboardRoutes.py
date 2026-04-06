from typing import Annotated

from config.db import get_db
from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from models.document import Document
from models.flashcard import FlashcardSet
from models.quiz import QuizAttempt
from models.user import User
from models.userActivity import UserActivity
from schemas.dashboard import DashboardActivitiesResponse, DashboardStatsResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette import status


db_dependency = Annotated[Session, Depends(get_db)]
current_user_dependency = Annotated[User, Depends(get_current_user)]


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse, status_code=status.HTTP_200_OK)
def get_dashboard_stats(db: db_dependency, current_user: current_user_dependency):
    total_docs = db.query(func.count(Document.id)).filter(Document.user_id == current_user.id).scalar() or 0
    total_flashcard_sets = (
        db.query(func.count(FlashcardSet.id)).filter(FlashcardSet.user_id == current_user.id).scalar() or 0
    )
    total_quizzes_attempted = (
        db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.user_id == current_user.id).scalar() or 0
    )

    return {
        "total_docs": int(total_docs),
        "total_flashcard_sets": int(total_flashcard_sets),
        "total_quizzes_attempted": int(total_quizzes_attempted),
    }


@router.get("/activities", response_model=DashboardActivitiesResponse, status_code=status.HTTP_200_OK)
def get_dashboard_activities(db: db_dependency, current_user: current_user_dependency):
    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == current_user.id)
        .order_by(UserActivity.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "activities": [
            {
                "id": str(activity.id),
                "activity_type": activity.activity_type,
                "label": activity.label,
                "related_id": activity.related_id,
                "related_type": activity.related_type,
                "created_at": activity.created_at,
            }
            for activity in activities
        ]
    }
