import uuid

from config.db import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID


class Quiz(Base):
	__tablename__ = "quizzes"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
	user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	name = Column(String, nullable=False)
	num_questions = Column(Integer, nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class QuizQuestion(Base):
	__tablename__ = "quiz_questions"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
	question = Column(Text, nullable=False)
	options = Column(JSON, nullable=False)
	correct_index = Column(Integer, nullable=False)
	explanation = Column(Text, nullable=False)


class QuizAttempt(Base):
	__tablename__ = "quiz_attempts"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
	user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	quiz_title = Column(String, nullable=False, default="")
	answers = Column(JSON, nullable=False)
	score = Column(Integer, nullable=False)
	attempted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
