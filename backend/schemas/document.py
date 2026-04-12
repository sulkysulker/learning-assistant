from datetime import datetime

from pydantic import BaseModel, Field


class DocumentItemResponse(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    uploaded_at: datetime
    flashcard_sets_count: int
    quizzes_count: int


class DocumentsListResponse(BaseModel):
    documents: list[DocumentItemResponse]


class DocumentDetailResponse(DocumentItemResponse):
    page_count: int
    file_url: str


class DocumentDeleteResponse(BaseModel):
    message: str
    deleted_document_id: str


class DocumentChatHistoryItem(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., min_length=1)


class DocumentChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[DocumentChatHistoryItem] = []


class DocumentChatResponse(BaseModel):
    response: str
