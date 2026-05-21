from datetime import datetime

from pydantic import BaseModel, Field


class FlashcardSetGenerateRequest(BaseModel):
	count: int = Field(default=10, ge=1, le=20)
	name: str | None = Field(default=None, max_length=120)


class FlashcardSetSummaryResponse(BaseModel):
	id: str
	name: str
	created_at: datetime
	cards_count: int


class FlashcardSetsListResponse(BaseModel):
	flashcard_sets: list[FlashcardSetSummaryResponse]


class FlashcardSetOverviewResponse(BaseModel):
	id: str
	document_id: str
	document_name: str
	name: str
	created_at: datetime
	cards_count: int


class FlashcardSetOverviewsResponse(BaseModel):
	flashcard_sets: list[FlashcardSetOverviewResponse]


class FlashcardCardResponse(BaseModel):
	id: str
	question: str
	answer: str
	difficulty: str
	is_starred: bool


class FlashcardSetDetailResponse(BaseModel):
	id: str
	document_id: str
	name: str
	created_at: datetime
	cards: list[FlashcardCardResponse]


class FlashcardSetDeleteResponse(BaseModel):
	message: str
	deleted_flashcard_set_id: str


class FlashcardToggleStarResponse(BaseModel):
	id: str
	set_id: str
	is_starred: bool