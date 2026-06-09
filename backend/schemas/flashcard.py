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
	reviewed_cards_count: int


class FlashcardSetsListResponse(BaseModel):
	flashcard_sets: list[FlashcardSetSummaryResponse]


class FlashcardSetOverviewResponse(BaseModel):
	id: str
	document_id: str
	document_name: str
	name: str
	created_at: datetime
	cards_count: int
	reviewed_cards_count: int


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
	document_name: str | None = None
	name: str
	created_at: datetime
	cards: list[FlashcardCardResponse]
	reviewed_card_ids: list[str] = Field(default_factory=list)
	reviewed_cards_count: int = 0


class FlashcardSetDeleteResponse(BaseModel):
	message: str
	deleted_flashcard_set_id: str


class FlashcardToggleStarResponse(BaseModel):
	id: str
	set_id: str
	is_starred: bool


class FlashcardReviewResponse(BaseModel):
	flashcard_id: str
	set_id: str
	reviewed_at: datetime
	reviewed_cards_count: int
	cards_count: int