from __future__ import annotations

from datetime import datetime, timezone
import re
from uuid import UUID

from fastapi import HTTPException
from models.document import Document
from models.quiz import Quiz, QuizAttempt, QuizQuestion
from models.user import User
from models.userActivity import UserActivity
from sqlalchemy.orm import Session
from utils.geminiService import generate_quiz_questions
from utils.pdfParser import extract_pdf_text
from utils.textChunker import select_relevant_chunks


SURROGATE_RE = re.compile(r"[\ud800-\udfff]")
MAX_CONTEXT_CHARS = 30000


def _sanitize_for_db(text: str) -> str:
	cleaned = SURROGATE_RE.sub("", text or "")
	return cleaned.encode("utf-8", "ignore").decode("utf-8", "ignore")


def _parse_uuid(identifier: str, error_message: str) -> UUID:
	try:
		return UUID(identifier)
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=error_message) from exc


def _get_owned_document(db: Session, current_user: User, document_id: str) -> Document:
	parsed_document_id = _parse_uuid(document_id, "Invalid document id")
	document = (
		db.query(Document)
		.filter(Document.id == parsed_document_id, Document.user_id == current_user.id)
		.first()
	)

	if not document:
		raise HTTPException(status_code=404, detail="Document not found")

	return document


def _get_owned_quiz(db: Session, current_user: User, quiz_id: str) -> Quiz:
	parsed_quiz_id = _parse_uuid(quiz_id, "Invalid quiz id")
	quiz = (
		db.query(Quiz)
		.filter(Quiz.id == parsed_quiz_id, Quiz.user_id == current_user.id)
		.first()
	)

	if not quiz:
		raise HTTPException(status_code=404, detail="Quiz not found")

	return quiz


def _ensure_document_text(db: Session, document: Document) -> str:
	if not document.extracted_text:
		extracted_text = _sanitize_for_db(extract_pdf_text(document.file_path))
		if not extracted_text:
			raise HTTPException(status_code=400, detail="Could not extract text from this PDF")

		document.extracted_text = extracted_text
		document.extracted_text_cached_at = datetime.now(timezone.utc)
		db.add(document)
		try:
			db.commit()
			db.refresh(document)
		except Exception:
			db.rollback()
			document.extracted_text = extracted_text

	working_text = _sanitize_for_db(document.extracted_text or "")
	if len(working_text.strip()) < 80:
		raise HTTPException(
			status_code=400,
			detail="Not enough extractable text was found in this PDF. It may be image-based/scanned.",
		)

	return working_text


def _format_quiz_name(document: Document, count: int) -> str:
	base_name = document.filename.rsplit(".", 1)[0].strip() or "Document"
	return f"{base_name} Quiz ({count})"


def _normalize_options(options: object) -> list[str] | None:
	if not isinstance(options, list):
		return None

	normalized = [str(option).strip() for option in options[:4]]
	if len(normalized) != 4 or any(not option for option in normalized):
		return None
	return normalized


def _normalize_question_payload(raw_question: object) -> dict | None:
	if not isinstance(raw_question, dict):
		return None

	question_text = str(raw_question.get("question") or "").strip()
	options = _normalize_options(raw_question.get("options"))
	if not question_text or not options:
		return None

	try:
		correct_index = int(raw_question.get("correct_index"))
	except (TypeError, ValueError):
		return None

	if correct_index < 0 or correct_index > 3:
		return None

	explanation = str(raw_question.get("explanation") or "").strip()
	if not explanation:
		explanation = "Review the document for the supporting detail."

	return {
		"question": question_text,
		"options": options,
		"correct_index": correct_index,
		"explanation": explanation,
	}


def _build_quiz_summary(quiz: Quiz, score: int | None, attempted_at: datetime | None) -> dict:
	return {
		"id": str(quiz.id),
		"name": quiz.name,
		"created_at": quiz.created_at,
		"num_questions": int(quiz.num_questions),
		"score": score if score is None else int(score),
		"attempted_at": attempted_at,
	}


def _build_question_detail(question: QuizQuestion) -> dict:
	options = question.options if isinstance(question.options, list) else []
	return {
		"id": str(question.id),
		"question": question.question,
		"options": [str(option) for option in options],
	}


def _load_latest_attempt_map(db: Session, current_user: User, quiz_ids: list[UUID]) -> dict[UUID, QuizAttempt]:
	if not quiz_ids:
		return {}

	attempts = (
		db.query(QuizAttempt)
		.filter(QuizAttempt.user_id == current_user.id, QuizAttempt.quiz_id.in_(quiz_ids))
		.order_by(QuizAttempt.attempted_at.desc())
		.all()
	)
	latest_attempt_map: dict[UUID, QuizAttempt] = {}
	for attempt in attempts:
		if attempt.quiz_id not in latest_attempt_map:
			latest_attempt_map[attempt.quiz_id] = attempt
	return latest_attempt_map


def list_document_quizzes(db: Session, current_user: User, document_id: str) -> dict:
	parsed_document_id = _parse_uuid(document_id, "Invalid document id")
	_ = _get_owned_document(db, current_user, document_id)

	quizzes = (
		db.query(Quiz)
		.filter(Quiz.user_id == current_user.id, Quiz.document_id == parsed_document_id)
		.order_by(Quiz.created_at.desc())
		.all()
	)

	quiz_ids = [quiz.id for quiz in quizzes]
	latest_attempt_map = _load_latest_attempt_map(db, current_user, quiz_ids)

	return {
		"quizzes": [
			_build_quiz_summary(
				quiz,
				latest_attempt_map[quiz.id].score if quiz.id in latest_attempt_map else None,
				latest_attempt_map[quiz.id].attempted_at if quiz.id in latest_attempt_map else None,
			)
			for quiz in quizzes
		]
	}


def generate_document_quiz(db: Session, current_user: User, document_id: str, num_questions: int) -> dict:
	document = _get_owned_document(db, current_user, document_id)
	working_text = _ensure_document_text(db, document)

	context_text = working_text[:MAX_CONTEXT_CHARS]
	raw_questions = generate_quiz_questions(document_title=document.filename, document_context=context_text, count=num_questions)
	if not raw_questions:
		raise HTTPException(status_code=502, detail="AI did not return any quiz questions")

	quiz_questions = []
	for raw_question in raw_questions[:num_questions]:
		question_payload = _normalize_question_payload(raw_question)
		if question_payload:
			quiz_questions.append(question_payload)

	if not quiz_questions:
		raise HTTPException(status_code=502, detail="AI returned invalid quiz questions")

	quiz = Quiz(
		user_id=current_user.id,
		document_id=document.id,
		name=_format_quiz_name(document, len(quiz_questions)),
		num_questions=len(quiz_questions),
	)
	db.add(quiz)
	db.flush()

	created_questions = []
	for item in quiz_questions:
		question = QuizQuestion(
			quiz_id=quiz.id,
			question=item["question"],
			options=item["options"],
			correct_index=item["correct_index"],
			explanation=item["explanation"],
		)
		db.add(question)
		created_questions.append(question)

	db.add(
		UserActivity(
			user_id=current_user.id,
			activity_type="created quiz",
			label=quiz.name,
			related_id=str(document.id),
			related_type="quiz",
		)
	)
	db.commit()
	db.refresh(quiz)
	for question in created_questions:
		db.refresh(question)

	return {
		"id": str(quiz.id),
		"document_id": str(quiz.document_id),
		"name": quiz.name,
		"created_at": quiz.created_at,
		"num_questions": int(quiz.num_questions),
		"questions": [_build_question_detail(question) for question in created_questions],
	}


def get_quiz_detail(db: Session, current_user: User, quiz_id: str) -> dict:
	quiz = _get_owned_quiz(db, current_user, quiz_id)
	questions = (
		db.query(QuizQuestion)
		.filter(QuizQuestion.quiz_id == quiz.id)
		.order_by(QuizQuestion.id.asc())
		.all()
	)

	return {
		"id": str(quiz.id),
		"document_id": str(quiz.document_id),
		"name": quiz.name,
		"created_at": quiz.created_at,
		"num_questions": int(quiz.num_questions),
		"questions": [_build_question_detail(question) for question in questions],
	}


def _normalize_submission_answers(raw_answers: list[object], total_questions: int) -> list[int | None]:
	normalized_answers: list[int | None] = []
	for index in range(total_questions):
		candidate = raw_answers[index] if index < len(raw_answers) else None
		if candidate is None or candidate == "":
			normalized_answers.append(None)
			continue
		try:
			normalized_answers.append(int(candidate))
		except (TypeError, ValueError):
			normalized_answers.append(None)
	return normalized_answers


def _build_result_payload(quiz: Quiz, questions: list[QuizQuestion], attempt: QuizAttempt) -> dict:
	answers = attempt.answers if isinstance(attempt.answers, list) else []
	question_payloads = []
	correct_count = 0

	for index, question in enumerate(questions):
		options = question.options if isinstance(question.options, list) else []
		user_answer_index = None
		if index < len(answers):
			candidate = answers[index]
			if candidate is not None:
				try:
					user_answer_index = int(candidate)
				except (TypeError, ValueError):
					user_answer_index = None

		correct_index = int(question.correct_index)
		correct_answer = str(options[correct_index]) if 0 <= correct_index < len(options) else ""
		user_answer = None
		if user_answer_index is not None and 0 <= user_answer_index < len(options):
			user_answer = str(options[user_answer_index])

		is_correct = user_answer_index is not None and user_answer_index == correct_index
		if is_correct:
			correct_count += 1

		question_payloads.append(
			{
				"id": str(question.id),
				"question": question.question,
				"options": [str(option) for option in options],
				"user_answer_index": user_answer_index,
				"user_answer": user_answer,
				"correct_index": correct_index,
				"correct_answer": correct_answer,
				"is_correct": is_correct,
				"explanation": question.explanation,
			}
		)

	num_questions = len(questions)
	incorrect_count = max(0, num_questions - correct_count)
	percentage = int(round((correct_count / num_questions) * 100)) if num_questions else 0

	return {
		"id": str(quiz.id),
		"document_id": str(quiz.document_id),
		"name": quiz.name,
		"created_at": quiz.created_at,
		"attempted_at": attempt.attempted_at,
		"num_questions": num_questions,
		"score": int(attempt.score),
		"correct_count": correct_count,
		"incorrect_count": incorrect_count,
		"percentage": percentage,
		"questions": question_payloads,
	}


def submit_quiz(db: Session, current_user: User, quiz_id: str, answers: list[object]) -> dict:
	quiz = _get_owned_quiz(db, current_user, quiz_id)
	questions = (
		db.query(QuizQuestion)
		.filter(QuizQuestion.quiz_id == quiz.id)
		.order_by(QuizQuestion.id.asc())
		.all()
	)

	if not questions:
		raise HTTPException(status_code=404, detail="Quiz questions were not found")

	normalized_answers = _normalize_submission_answers(answers, len(questions))
	score = 0
	for index, question in enumerate(questions):
		selected = normalized_answers[index]
		if selected is not None and selected == int(question.correct_index):
			score += 1

	attempt = QuizAttempt(
		quiz_id=quiz.id,
		user_id=current_user.id,
		quiz_title=quiz.name,
		answers=normalized_answers,
		score=score,
	)
	db.add(attempt)
	db.commit()
	db.refresh(attempt)

	return _build_result_payload(quiz, questions, attempt)


def get_quiz_result(db: Session, current_user: User, quiz_id: str) -> dict:
	quiz = _get_owned_quiz(db, current_user, quiz_id)
	questions = (
		db.query(QuizQuestion)
		.filter(QuizQuestion.quiz_id == quiz.id)
		.order_by(QuizQuestion.id.asc())
		.all()
	)
	if not questions:
		raise HTTPException(status_code=404, detail="Quiz questions were not found")

	attempt = (
		db.query(QuizAttempt)
		.filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == current_user.id)
		.order_by(QuizAttempt.attempted_at.desc())
		.first()
	)
	if not attempt:
		raise HTTPException(status_code=404, detail="Quiz has not been attempted yet")

	return _build_result_payload(quiz, questions, attempt)


def delete_quiz(db: Session, current_user: User, quiz_id: str) -> dict:
	quiz = _get_owned_quiz(db, current_user, quiz_id)
	db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == current_user.id).delete(synchronize_session=False)
	db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).delete(synchronize_session=False)
	db.delete(quiz)
	db.commit()

	return {
		"message": "Quiz deleted successfully",
		"deleted_quiz_id": str(quiz.id),
	}
