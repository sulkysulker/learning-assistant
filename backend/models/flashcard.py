import uuid

from sqlalchemy import (
	Boolean,
	Column,
	DateTime,
	ForeignKey,
	String,
	Text,
	UniqueConstraint,
	func,
	text,
)
from sqlalchemy.dialects.postgresql import UUID

from config.db import Base


class FlashcardSet(Base):
	__tablename__ = "flashcard_sets"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
	name = Column("title", String, nullable=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Flashcard(Base):
	__tablename__ = "flashcards"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	set_id = Column(UUID(as_uuid=True), ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False, index=True)
	question = Column(Text, nullable=False)
	answer = Column(Text, nullable=False)
	difficulty = Column(String, nullable=False)
	is_starred = Column(Boolean, nullable=False, default=False, server_default=text("false"))


class FlashcardReview(Base):
	__tablename__ = "flashcard_reviews"
	__table_args__ = (UniqueConstraint("user_id", "flashcard_id", name="uq_flashcard_reviews_user_card"),)

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	flashcard_id = Column(UUID(as_uuid=True), ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False, index=True)
	reviewed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
