from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette import status

from config.db import get_db
from controllers.flashcardController import (
	delete_flashcard_set,
	generate_flashcard_set,
	get_flashcard_set_detail,
	list_flashcard_sets,
	list_user_flashcard_sets,
	mark_flashcard_reviewed,
	toggle_flashcard_star,
)
from middleware.auth import get_current_user
from models.user import User
from schemas.flashcard import (
	FlashcardReviewResponse,
	FlashcardSetDeleteResponse,
	FlashcardSetDetailResponse,
	FlashcardSetGenerateRequest,
	FlashcardSetOverviewsResponse,
	FlashcardSetsListResponse,
	FlashcardToggleStarResponse,
)

db_dependency = Annotated[Session, Depends(get_db)]
current_user_dependency = Annotated[User, Depends(get_current_user)]


router = APIRouter(prefix="/documents", tags=["flashcards"])
set_router = APIRouter(prefix="/flashcard-sets", tags=["flashcards"])
flashcards_router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@flashcards_router.get("", response_model=FlashcardSetOverviewsResponse, status_code=status.HTTP_200_OK)
def get_user_flashcard_sets(db: db_dependency, current_user: current_user_dependency):
	return list_user_flashcard_sets(db, current_user)


@flashcards_router.patch(
	"/{card_id}/reviewed",
	response_model=FlashcardReviewResponse,
	status_code=status.HTTP_200_OK,
)
def review_flashcard(card_id: str, db: db_dependency, current_user: current_user_dependency):
	return mark_flashcard_reviewed(db, current_user, card_id)


@router.get("/{document_id}/flashcards", response_model=FlashcardSetsListResponse, status_code=status.HTTP_200_OK)
def get_document_flashcard_sets(document_id: str, db: db_dependency, current_user: current_user_dependency):
	return list_flashcard_sets(db, current_user, document_id)


@router.post(
	"/{document_id}/flashcards/generate",
	response_model=FlashcardSetDetailResponse,
	status_code=status.HTTP_201_CREATED,
)
def create_document_flashcards(
	document_id: str,
	payload: FlashcardSetGenerateRequest,
	db: db_dependency,
	current_user: current_user_dependency,
):
	return generate_flashcard_set(db, current_user, document_id, payload.count, payload.name)


@set_router.get("/{set_id}", response_model=FlashcardSetDetailResponse, status_code=status.HTTP_200_OK)
def get_flashcard_set(set_id: str, db: db_dependency, current_user: current_user_dependency):
	return get_flashcard_set_detail(db, current_user, set_id)


@set_router.patch(
	"/{set_id}/cards/{card_id}/star",
	response_model=FlashcardToggleStarResponse,
	status_code=status.HTTP_200_OK,
)
def toggle_star_on_card(set_id: str, card_id: str, db: db_dependency, current_user: current_user_dependency):
	return toggle_flashcard_star(db, current_user, set_id, card_id)


@set_router.delete("/{set_id}", response_model=FlashcardSetDeleteResponse, status_code=status.HTTP_200_OK)
def remove_flashcard_set(set_id: str, db: db_dependency, current_user: current_user_dependency):
	return delete_flashcard_set(db, current_user, set_id)
