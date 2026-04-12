from google import genai

from config.settings import settings


FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite"]


def _is_quota_error(exc: Exception) -> bool:
	message = str(exc).lower()
	return "resource_exhausted" in message or "quota" in message or "429" in message


def _is_model_not_found_error(exc: Exception) -> bool:
	message = str(exc).lower()
	return "not_found" in message or "404" in message or "is not found" in message


def generate_grounded_answer(system_prompt: str, history: list[dict], user_message: str) -> str:
	if not settings.GEMINI_API_KEY:
		raise ValueError("GEMINI_API_KEY is not configured")

	client = genai.Client(api_key=settings.GEMINI_API_KEY)
	model_candidates = [settings.GEMINI_MODEL] + [model for model in FALLBACK_MODELS if model != settings.GEMINI_MODEL]

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

	if not text:
		return "I could not find an answer in the document."
	return text
