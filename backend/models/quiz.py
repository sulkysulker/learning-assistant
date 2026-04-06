import uuid

from config.db import Base
from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID


class QuizAttempt(Base):
	__tablename__ = "quiz_attempts"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	quiz_title = Column(String, nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
