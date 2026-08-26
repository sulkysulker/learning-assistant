from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from models.document import Document
from models.flashcard import Flashcard, FlashcardReview, FlashcardSet
from models.user import User
from models.userActivity import UserActivity
from sqlalchemy import func
from sqlalchemy.orm import Session
from utils.geminiService import generate_flashcards
from utils.pdfParser import extract_pdf_text

SURROGATE_RE = re.compile(r"[\ud800-\udfff]")
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


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
		except Exception:  # noqa: BLE001
			db.rollback()
			document.extracted_text = extracted_text

	working_text = _sanitize_for_db(document.extracted_text or "")
	if len(working_text.strip()) < 80:
		raise HTTPException(
			status_code=400,
			detail="Not enough extractable text was found in this PDF. It may be image-based/scanned.",
		)

	return working_text


def _format_set_name(document: Document, count: int, custom_name: str | None = None) -> str:
	if custom_name and custom_name.strip():
		return custom_name.strip()

	base_name = document.filename.rsplit(".", 1)[0].strip() or "Document"
	return f"{base_name} Flashcards ({count})"


def _build_set_summary(flashcard_set: FlashcardSet, cards_count: int, reviewed_cards_count: int) -> dict:
	return {
		"id": str(flashcard_set.id),
		"name": flashcard_set.name,
		"created_at": flashcard_set.created_at,
		"cards_count": int(cards_count),
		"reviewed_cards_count": int(reviewed_cards_count),
	}


def _build_set_overview(flashcard_set: FlashcardSet, document_name: str, cards_count: int, reviewed_cards_count: int) -> dict:
	return {
		"id": str(flashcard_set.id),
		"document_id": str(flashcard_set.document_id),
		"document_name": document_name,
		"name": flashcard_set.name,
		"created_at": flashcard_set.created_at,
		"cards_count": int(cards_count),
		"reviewed_cards_count": int(reviewed_cards_count),
	}


def _build_card_payload(card: Flashcard) -> dict:
	return {
		"id": str(card.id),
		"question": card.question,
		"answer": card.answer,
		"difficulty": card.difficulty,
		"is_starred": bool(card.is_starred),
	}


def _get_set_progress(db: Session, current_user: User, set_ids: list[UUID]) -> dict[UUID, dict[str, int]]:
	if not set_ids:
		return {}

	total_rows = (
		db.query(Flashcard.set_id, func.count(Flashcard.id))
		.filter(Flashcard.set_id.in_(set_ids))
		.group_by(Flashcard.set_id)
		.all()
	)
	reviewed_rows = (
		db.query(Flashcard.set_id, func.count(FlashcardReview.id))
		.join(FlashcardReview, FlashcardReview.flashcard_id == Flashcard.id)
		.filter(FlashcardReview.user_id == current_user.id, Flashcard.set_id.in_(set_ids))
		.group_by(Flashcard.set_id)
		.all()
	)

	progress_map: dict[UUID, dict[str, int]] = {}
	for set_id, total_cards in total_rows:
		progress_map[set_id] = {"cards_count": int(total_cards), "reviewed_cards_count": 0}

	for set_id, reviewed_cards in reviewed_rows:
		progress_map.setdefault(set_id, {"cards_count": 0, "reviewed_cards_count": 0})
		progress_map[set_id]["reviewed_cards_count"] = int(reviewed_cards)

	return progress_map


def list_flashcard_sets(db: Session, current_user: User, document_id: str) -> dict:
	parsed_document_id = _parse_uuid(document_id, "Invalid document id")
	_ = _get_owned_document(db, current_user, document_id)

	sets = (
		db.query(FlashcardSet)
		.filter(FlashcardSet.user_id == current_user.id, FlashcardSet.document_id == parsed_document_id)
		.order_by(FlashcardSet.created_at.desc())
		.all()
	)

	set_ids = [flashcard_set.id for flashcard_set in sets]
	progress_map = _get_set_progress(db, current_user, set_ids)

	return {
		"flashcard_sets": [
			_build_set_summary(
				flashcard_set,
				progress_map.get(flashcard_set.id, {}).get("cards_count", 0),
				progress_map.get(flashcard_set.id, {}).get("reviewed_cards_count", 0),
			)
			for flashcard_set in sets
		]
	}


def list_user_flashcard_sets(db: Session, current_user: User) -> dict:
	rows = (
		db.query(FlashcardSet, Document.filename)
		.outerjoin(Document, Document.id == FlashcardSet.document_id)
		.filter(FlashcardSet.user_id == current_user.id)
		.order_by(FlashcardSet.created_at.desc())
		.all()
	)

	flashcard_sets = [row[0] for row in rows]
	set_ids = [flashcard_set.id for flashcard_set in flashcard_sets]
	progress_map = _get_set_progress(db, current_user, set_ids)

	return {
		"flashcard_sets": [
			_build_set_overview(
				flashcard_set=row[0],
				document_name=row[1] or "Document",
				cards_count=progress_map.get(row[0].id, {}).get("cards_count", 0),
				reviewed_cards_count=progress_map.get(row[0].id, {}).get("reviewed_cards_count", 0),
			)
			for row in rows
		]
	}


def mark_flashcard_reviewed(db: Session, current_user: User, card_id: str) -> dict:
	parsed_card_id = _parse_uuid(card_id, "Invalid flashcard id")
	card = (
		db.query(Flashcard)
		.join(FlashcardSet, Flashcard.set_id == FlashcardSet.id)
		.filter(Flashcard.id == parsed_card_id, FlashcardSet.user_id == current_user.id)
		.first()
	)

	if not card:
		raise HTTPException(status_code=404, detail="Flashcard not found")

	review = (
		db.query(FlashcardReview)
		.filter(FlashcardReview.user_id == current_user.id, FlashcardReview.flashcard_id == card.id)
		.first()
	)
	reviewed_at = datetime.now(timezone.utc)
	if review:
		review.reviewed_at = reviewed_at
	else:
		review = FlashcardReview(user_id=current_user.id, flashcard_id=card.id, reviewed_at=reviewed_at)
		db.add(review)

	db.commit()
	db.refresh(review)

	total_cards = db.query(func.count(Flashcard.id)).filter(Flashcard.set_id == card.set_id).scalar() or 0
	reviewed_cards = (
		db.query(func.count(FlashcardReview.id))
		.join(Flashcard, FlashcardReview.flashcard_id == Flashcard.id)
		.filter(FlashcardReview.user_id == current_user.id, Flashcard.set_id == card.set_id)
		.scalar()
		or 0
	)

	return {
		"flashcard_id": str(card.id),
		"set_id": str(card.set_id),
		"reviewed_at": review.reviewed_at,
		"reviewed_cards_count": int(reviewed_cards),
		"cards_count": int(total_cards),
	}


def generate_flashcard_set(db: Session, current_user: User, document_id: str, count: int, name: str | None = None) -> dict:
	document = _get_owned_document(db, current_user, document_id)
	working_text = _ensure_document_text(db, document)

	context_text = working_text[:30000]
	flashcard_items = generate_flashcards(document_title=document.filename, document_context=context_text, count=count)
	if not flashcard_items:
		raise HTTPException(status_code=502, detail="AI did not return any flashcards")

	flashcard_set = FlashcardSet(
		user_id=current_user.id,
		document_id=document.id,
		name=_format_set_name(document, count, name),
	)
	db.add(flashcard_set)
	db.flush()

	created_cards = []
	for item in flashcard_items[:count]:
		question = str((item or {}).get("question") or "").strip()
		answer = str((item or {}).get("answer") or "").strip()
		difficulty = str((item or {}).get("difficulty") or "medium").strip().lower()
		if difficulty not in VALID_DIFFICULTIES:
			difficulty = "medium"

		if not question or not answer:
			continue

		card = Flashcard(
			set_id=flashcard_set.id,
			question=question,
			answer=answer,
			difficulty=difficulty,
			is_starred=False,
		)
		db.add(card)
		created_cards.append(card)

	if not created_cards:
		db.rollback()
		raise HTTPException(status_code=502, detail="AI returned invalid flashcards")

	db.add(
		UserActivity(
			user_id=current_user.id,
			activity_type="created flashcard set",
			label=flashcard_set.name,
			related_id=str(document.id),
			related_type="flashcard_set",
		)
	)

	db.commit()
	db.refresh(flashcard_set)
	for card in created_cards:
		db.refresh(card)

	return {
		"id": str(flashcard_set.id),
		"document_id": str(flashcard_set.document_id),
		"name": flashcard_set.name,
		"created_at": flashcard_set.created_at,
		"cards": [_build_card_payload(card) for card in created_cards],
	}


def get_flashcard_set_detail(db: Session, current_user: User, set_id: str) -> dict:
	parsed_set_id = _parse_uuid(set_id, "Invalid flashcard set id")
	flashcard_set = (
		db.query(FlashcardSet)
		.filter(FlashcardSet.id == parsed_set_id, FlashcardSet.user_id == current_user.id)
		.first()
	)

	if not flashcard_set:
		raise HTTPException(status_code=404, detail="Flashcard set not found")

	document_name = None
	if flashcard_set.document_id:
		document_name = (
			db.query(Document.filename)
			.filter(Document.id == flashcard_set.document_id, Document.user_id == current_user.id)
			.scalar()
		)

	cards = (
		db.query(Flashcard)
		.filter(Flashcard.set_id == flashcard_set.id)
		.order_by(Flashcard.id.asc())
		.all()
	)

	reviewed_card_ids = [
		str(row[0])
		for row in (
			db.query(FlashcardReview.flashcard_id)
			.join(Flashcard, FlashcardReview.flashcard_id == Flashcard.id)
			.filter(FlashcardReview.user_id == current_user.id, Flashcard.set_id == flashcard_set.id)
			.all()
		)
	]

	return {
		"id": str(flashcard_set.id),
		"document_id": str(flashcard_set.document_id),
		"document_name": document_name,
		"name": flashcard_set.name,
		"created_at": flashcard_set.created_at,
		"cards": [_build_card_payload(card) for card in cards],
		"reviewed_card_ids": reviewed_card_ids,
		"reviewed_cards_count": len(reviewed_card_ids),
	}


def delete_flashcard_set(db: Session, current_user: User, set_id: str) -> dict:
	parsed_set_id = _parse_uuid(set_id, "Invalid flashcard set id")
	flashcard_set = (
		db.query(FlashcardSet)
		.filter(FlashcardSet.id == parsed_set_id, FlashcardSet.user_id == current_user.id)
		.first()
	)

	if not flashcard_set:
		raise HTTPException(status_code=404, detail="Flashcard set not found")

	db.query(Flashcard).filter(Flashcard.set_id == flashcard_set.id).delete(synchronize_session=False)
	db.delete(flashcard_set)
	db.commit()

	return {
		"message": "Flashcard set deleted successfully",
		"deleted_flashcard_set_id": str(parsed_set_id),
	}


def toggle_flashcard_star(db: Session, current_user: User, set_id: str, card_id: str) -> dict:
	parsed_set_id = _parse_uuid(set_id, "Invalid flashcard set id")
	parsed_card_id = _parse_uuid(card_id, "Invalid flashcard id")

	card = (
		db.query(Flashcard)
		.join(FlashcardSet, Flashcard.set_id == FlashcardSet.id)
		.filter(
			Flashcard.id == parsed_card_id,
			FlashcardSet.id == parsed_set_id,
			FlashcardSet.user_id == current_user.id,
		)
		.first()
	)

	if not card:
		raise HTTPException(status_code=404, detail="Flashcard not found")

	card.is_starred = not bool(card.is_starred)
	db.add(card)
	db.commit()
	db.refresh(card)

	return {
		"id": str(card.id),
		"set_id": str(card.set_id),
		"is_starred": bool(card.is_starred),
	}
