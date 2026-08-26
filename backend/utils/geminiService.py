import json
import re

from google import genai

from config.settings import settings

FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite"]
JSON_CODE_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _is_quota_error(exc: Exception) -> bool:
	message = str(exc).lower()
	return "resource_exhausted" in message or "quota" in message or "429" in message


def _is_model_not_found_error(exc: Exception) -> bool:
	message = str(exc).lower()
	return "not_found" in message or "404" in message or "is not found" in message


def _extract_text(response) -> str:
	text = (getattr(response, "text", None) or "").strip()
	if not text and getattr(response, "candidates", None):
		parts = []
		for candidate in response.candidates:
			content = getattr(candidate, "content", None)
			if not content:
				continue
			for part in getattr(content, "parts", []) or []:
				piece = getattr(part, "text", None)
				if piece:
					parts.append(piece)
		text = "\n".join(parts).strip()
	return text


def _generate_prompt(prompt: str) -> str:
	if not settings.GEMINI_API_KEY:
		raise ValueError("GEMINI_API_KEY is not configured")

	client = genai.Client(api_key=settings.GEMINI_API_KEY)
	model_candidates = [settings.GEMINI_MODEL] + [model for model in FALLBACK_MODELS if model != settings.GEMINI_MODEL]

	last_error = None
	response = None
	for model_name in model_candidates:
		try:
			response = client.models.generate_content(model=model_name, contents=prompt)
			last_error = None
			break
		except Exception as exc:
			last_error = exc
			if _is_quota_error(exc) or _is_model_not_found_error(exc):
				continue
			raise

	if response is None:
		raise RuntimeError(last_error or "No AI response was returned")

	return _extract_text(response)


def _extract_json_payload(text: str):
	cleaned = (text or "").strip()
	match = JSON_CODE_FENCE_RE.search(cleaned)
	if match:
		cleaned = match.group(1).strip()

	for candidate in (cleaned, cleaned.strip("`").strip()):
		if not candidate:
			continue
		try:
			return json.loads(candidate)
		except json.JSONDecodeError:
			continue

	array_start = cleaned.find("[")
	array_end = cleaned.rfind("]")
	if array_start != -1 and array_end != -1 and array_end > array_start:
		try:
			return json.loads(cleaned[array_start:array_end + 1])
		except json.JSONDecodeError:
			pass

	object_start = cleaned.find("{")
	object_end = cleaned.rfind("}")
	if object_start != -1 and object_end != -1 and object_end > object_start:
		try:
			return json.loads(cleaned[object_start:object_end + 1])
		except json.JSONDecodeError:
			pass

	raise ValueError("AI response was not valid JSON")


def generate_grounded_answer(system_prompt: str, history: list[dict], user_message: str) -> str:
	history_lines = []
	for item in history:
		role = (item.get("role") or "user").strip().lower()
		content = (item.get("content") or "").strip()
		if not content:
			continue
		if role not in {"user", "assistant"}:
			role = "user"
		label = "User" if role == "user" else "Assistant"
		history_lines.append(f"{label}: {content}")

	joined_history = "\n".join(history_lines).strip()
	prompt = (
		f"{system_prompt}\n\n"
		"NON-SOURCE CHAT HISTORY (for tone/continuity only, not facts):\n"
		f"{joined_history if joined_history else 'No prior messages.'}\n\n"
		"CURRENT USER QUESTION:\n"
		f"{user_message}\n\n"
		"Answer based only on DOCUMENT CONTEXT."
	)

	text = _generate_prompt(prompt)

	if not text:
		return "I could not find an answer in the document."
	return text


def generate_flashcards(document_title: str, document_context: str, count: int) -> list[dict]:
	if count < 1:
		raise ValueError("Flashcard count must be at least 1")

	prompt = (
		"You are generating study flashcards from a document. Create concise, useful cards that test comprehension. "
		"Use only the document context below. Return ONLY valid JSON. No markdown, no code fences, no commentary.\n\n"
		f"Document title: {document_title}\n"
		f"Requested cards: {count}\n\n"
		"Return an array of objects with exactly these keys: question, answer, difficulty. "
		"Difficulty must be one of easy, medium, hard. Keep questions specific and answers short but complete.\n\n"
		f"DOCUMENT CONTEXT:\n{document_context}"
	)

	text = _generate_prompt(prompt)
	data = _extract_json_payload(text)

	if isinstance(data, dict) and "flashcards" in data:
		data = data["flashcards"]

	if not isinstance(data, list):
		raise TypeError("AI flashcard response must be a JSON array")

	return data[:count]


def generate_quiz_questions(document_title: str, document_context: str, count: int) -> list[dict]:
	if count < 1:
		raise ValueError("Quiz question count must be at least 1")

	prompt = (
		"You are generating a multiple choice quiz from a document. Create questions that test comprehension and recall. "
		"Use only the document context below. Return ONLY valid JSON. No markdown, no code fences, no commentary.\n\n"
		f"Document title: {document_title}\n"
		f"Requested questions: {count}\n\n"
		"Return an array of objects with exactly these keys: question, options, correct_index, explanation. "
		"Each options value must be an array of exactly four distinct answer choices. correct_index must be an integer from 0 to 3. "
		"The explanation must briefly justify the correct answer and should stay grounded in the document.\n\n"
		f"DOCUMENT CONTEXT:\n{document_context}"
	)

	text = _generate_prompt(prompt)
	data = _extract_json_payload(text)

	if isinstance(data, dict) and "questions" in data:
		data = data["questions"]

	if not isinstance(data, list):
		raise TypeError("AI quiz response must be a JSON array")

	return data[:count]
