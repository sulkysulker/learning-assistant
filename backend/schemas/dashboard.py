from datetime import datetime

from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_docs: int
    total_flashcard_sets: int
    total_quizzes_attempted: int


class DashboardActivityResponse(BaseModel):
    id: str
    activity_type: str
    label: str
    related_id: str
    related_type: str
    created_at: datetime


class DashboardActivitiesResponse(BaseModel):
    activities: list[DashboardActivityResponse]
