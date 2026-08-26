from typing import Annotated

from config.db import get_db
from controllers.quizController import (
	delete_quiz,
	generate_document_quiz,
	get_quiz_detail,
	get_quiz_result,
	list_document_quizzes,
	submit_quiz,
)
from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from models.user import User
from schemas.quiz import (
	QuizDeleteResponse,
	QuizDetailResponse,
	QuizGenerateRequest,
	QuizListResponse,
	QuizResultResponse,
	QuizSubmitRequest,
)
from sqlalchemy.orm import Session
from starlette import status

db_dependency = Annotated[Session, Depends(get_db)]
current_user_dependency = Annotated[User, Depends(get_current_user)]


router = APIRouter(prefix="/documents", tags=["quizzes"])
quiz_router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.get("/{document_id}/quizzes", response_model=QuizListResponse, status_code=status.HTTP_200_OK)
def get_document_quizzes(document_id: str, db: db_dependency, current_user: current_user_dependency):
	return list_document_quizzes(db, current_user, document_id)


@router.post(
	"/{document_id}/quizzes/generate",
	response_model=QuizDetailResponse,
	status_code=status.HTTP_201_CREATED,
)
def create_document_quiz(
	document_id: str,
	payload: QuizGenerateRequest,
	db: db_dependency,
	current_user: current_user_dependency,
):
	return generate_document_quiz(db, current_user, document_id, payload.num_questions)


@quiz_router.get("/{quiz_id}", response_model=QuizDetailResponse, status_code=status.HTTP_200_OK)
def fetch_quiz_detail(quiz_id: str, db: db_dependency, current_user: current_user_dependency):
	return get_quiz_detail(db, current_user, quiz_id)


@quiz_router.post("/{quiz_id}/submit", response_model=QuizResultResponse, status_code=status.HTTP_200_OK)
def submit_quiz_attempt(quiz_id: str, payload: QuizSubmitRequest, db: db_dependency, current_user: current_user_dependency):
	return submit_quiz(db, current_user, quiz_id, payload.answers)


@quiz_router.get("/{quiz_id}/result", response_model=QuizResultResponse, status_code=status.HTTP_200_OK)
def fetch_quiz_result(quiz_id: str, db: db_dependency, current_user: current_user_dependency):
	return get_quiz_result(db, current_user, quiz_id)


@quiz_router.delete("/{quiz_id}", response_model=QuizDeleteResponse, status_code=status.HTTP_200_OK)
def remove_quiz(quiz_id: str, db: db_dependency, current_user: current_user_dependency):
	return delete_quiz(db, current_user, quiz_id)
