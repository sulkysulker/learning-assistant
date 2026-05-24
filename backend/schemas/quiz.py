from datetime import datetime

from pydantic import BaseModel, Field


class QuizGenerateRequest(BaseModel):
	num_questions: int = Field(default=10, ge=1, le=20)


class QuizSummaryResponse(BaseModel):
	id: str
	name: str
	created_at: datetime
	num_questions: int
	score: int | None
	attempted_at: datetime | None = None


class QuizListResponse(BaseModel):
	quizzes: list[QuizSummaryResponse]


class QuizQuestionResponse(BaseModel):
	id: str
	question: str
	options: list[str]


class QuizDetailResponse(BaseModel):
	id: str
	document_id: str
	name: str
	created_at: datetime
	num_questions: int
	questions: list[QuizQuestionResponse]


class QuizSubmitRequest(BaseModel):
	answers: list[int | None] = Field(default_factory=list)


class QuizResultQuestionResponse(BaseModel):
	id: str
	question: str
	options: list[str]
	user_answer_index: int | None = None
	user_answer: str | None = None
	correct_index: int
	correct_answer: str
	is_correct: bool
	explanation: str


class QuizResultResponse(BaseModel):
	id: str
	document_id: str
	name: str
	created_at: datetime
	attempted_at: datetime
	num_questions: int
	score: int
	correct_count: int
	incorrect_count: int
	percentage: int
	questions: list[QuizResultQuestionResponse]


class QuizDeleteResponse(BaseModel):
	message: str
	deleted_quiz_id: str
