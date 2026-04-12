import uuid

from config.db import Base
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID


class Document(Base):
	__tablename__ = "documents"

	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
	user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	filename = Column(String, nullable=False)
	file_path = Column(String, nullable=False)
	file_size_bytes = Column(BigInteger, nullable=False)
	extracted_text = Column(Text, nullable=True)
	extracted_text_cached_at = Column(DateTime(timezone=True), nullable=True)
	uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
