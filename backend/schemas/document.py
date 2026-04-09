from datetime import datetime

from pydantic import BaseModel


class DocumentItemResponse(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    uploaded_at: datetime
    flashcard_sets_count: int
    quizzes_count: int


class DocumentsListResponse(BaseModel):
    documents: list[DocumentItemResponse]


class DocumentDeleteResponse(BaseModel):
    message: str
    deleted_document_id: str
