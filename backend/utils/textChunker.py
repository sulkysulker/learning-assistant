import re


WORD_PATTERN = re.compile(r"[a-zA-Z0-9_]{3,}")


def _normalize_tokens(text: str) -> set[str]:
	return {token.lower() for token in WORD_PATTERN.findall(text or "")}


def chunk_text(text: str, chunk_size: int = 1400, overlap: int = 200) -> list[str]:
	if not text:
		return []

	clean_text = text.strip()
	if len(clean_text) <= chunk_size:
		return [clean_text]

	chunks = []
	start = 0
	step = max(1, chunk_size - overlap)

	while start < len(clean_text):
		end = start + chunk_size
		chunk = clean_text[start:end].strip()
		if chunk:
			chunks.append(chunk)
		start += step

	return chunks


def select_relevant_chunks(text: str, query: str, max_chunks: int = 6) -> list[str]:
	chunks = chunk_text(text)
	if not chunks:
		return []

	query_tokens = _normalize_tokens(query)
	if not query_tokens:
		return chunks[:max_chunks]

	scored = []
	for index, chunk in enumerate(chunks):
		chunk_tokens = _normalize_tokens(chunk)
		overlap_score = len(query_tokens.intersection(chunk_tokens))
		scored.append((overlap_score, -index, chunk))

	scored.sort(reverse=True)
	best = [item[2] for item in scored[:max_chunks] if item[0] > 0]

	if best:
		return best

	# Fall back to early chunks when lexical overlap is low.
	return chunks[:max_chunks]
