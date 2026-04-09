from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from models.document import Document
from models.flashcard import FlashcardSet
from models.quiz import QuizAttempt
from models.user import User
from models.userActivity import UserActivity
from sqlalchemy import func
from sqlalchemy.orm import Session


ALLOWED_PDF_CONTENT_TYPES = {"application/pdf"}
UPLOADS_DIR = Path("uploads")


def _assert_pdf(file: UploadFile) -> None:
	content_type = (file.content_type or "").lower().strip()
	file_name = (file.filename or "").lower().strip()

	if not file_name.endswith(".pdf"):
		raise HTTPException(status_code=400, detail="Only PDF files are allowed")

	if content_type and content_type not in ALLOWED_PDF_CONTENT_TYPES:
		raise HTTPException(status_code=400, detail="Only PDF files are allowed")


def _build_document_payload(db: Session, document: Document) -> dict:
	flashcard_sets_count = (
		db.query(func.count(FlashcardSet.id))
		.filter(FlashcardSet.user_id == document.user_id, FlashcardSet.document_id == document.id)
		.scalar()
		or 0
	)
	quizzes_count = (
		db.query(func.count(QuizAttempt.id))
		.filter(QuizAttempt.user_id == document.user_id, QuizAttempt.document_id == document.id)
		.scalar()
		or 0
	)

	return {
		"id": str(document.id),
		"filename": document.filename,
		"file_size_bytes": int(document.file_size_bytes),
		"uploaded_at": document.uploaded_at,
		"flashcard_sets_count": int(flashcard_sets_count),
		"quizzes_count": int(quizzes_count),
	}


def list_documents(db: Session, current_user: User) -> dict:
	documents = (
		db.query(Document)
		.filter(Document.user_id == current_user.id)
		.order_by(Document.uploaded_at.desc())
		.all()
	)

	return {"documents": [_build_document_payload(db, doc) for doc in documents]}


def upload_document(db: Session, current_user: User, file: UploadFile) -> dict:
	_assert_pdf(file)

	UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
	original_name = Path(file.filename).name
	saved_name = f"{uuid4()}_{original_name}"
	destination = UPLOADS_DIR / saved_name

	contents = file.file.read()
	if not contents:
		raise HTTPException(status_code=400, detail="Uploaded file is empty")

	try:
		with destination.open("wb") as output:
			output.write(contents)

		document = Document(
			user_id=current_user.id,
			filename=original_name,
			file_path=str(destination.as_posix()),
			file_size_bytes=len(contents),
		)
		db.add(document)
		db.flush()

		db.add(
			UserActivity(
				user_id=current_user.id,
				activity_type="uploaded document",
				label=original_name,
				related_id=str(document.id),
				related_type="document",
			)
		)

		db.commit()
		db.refresh(document)
	except Exception:
		if destination.exists():
			destination.unlink(missing_ok=True)
		db.rollback()
		raise
	finally:
		file.file.close()

	return _build_document_payload(db, document)


def delete_document(db: Session, current_user: User, document_id: str) -> dict:
	try:
		parsed_document_id = UUID(document_id)
	except ValueError as exc:
		raise HTTPException(status_code=400, detail="Invalid document id") from exc

	document = (
		db.query(Document)
		.filter(Document.id == parsed_document_id, Document.user_id == current_user.id)
		.first()
	)

	if not document:
		raise HTTPException(status_code=404, detail="Document not found")

	db.query(FlashcardSet).filter(
		FlashcardSet.user_id == current_user.id,
		FlashcardSet.document_id == parsed_document_id,
	).delete(synchronize_session=False)
	db.query(QuizAttempt).filter(
		QuizAttempt.user_id == current_user.id,
		QuizAttempt.document_id == parsed_document_id,
	).delete(synchronize_session=False)
	db.query(UserActivity).filter(
		UserActivity.user_id == current_user.id,
		UserActivity.related_type == "document",
		UserActivity.related_id == str(parsed_document_id),
	).delete(synchronize_session=False)

	file_path = Path(document.file_path)
	db.delete(document)
	db.commit()

	if file_path.exists():
		file_path.unlink(missing_ok=True)

	return {
		"message": "Document deleted successfully",
		"deleted_document_id": str(parsed_document_id),
	}
