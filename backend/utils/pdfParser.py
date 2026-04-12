from pathlib import Path
import re

from pypdf import PdfReader


SURROGATE_RE = re.compile(r"[\ud800-\udfff]")


def _clean_text(value: str) -> str:
	# Drop invalid surrogate code points that cannot be UTF-8 encoded for DB writes.
	cleaned = SURROGATE_RE.sub("", value or "")
	return cleaned.encode("utf-8", "ignore").decode("utf-8", "ignore")


def extract_pdf_text(file_path: str) -> str:
	path = Path(file_path)
	if not path.exists():
		return ""

	reader = PdfReader(str(path))
	pages_text = []
	for page in reader.pages:
		text = page.extract_text() or ""
		text = _clean_text(text)
		if text.strip():
			pages_text.append(text.strip())

	return _clean_text("\n\n".join(pages_text).strip())
