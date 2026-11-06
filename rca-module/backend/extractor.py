import re
from email import policy
from email.parser import BytesParser
from io import BytesIO

from pypdf import PdfReader

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB limit
MIN_USEFUL_CHARS = 30


class ExtractionError(Exception):
    """Raised when we cannot read the given input."""


def clean_text(text: str) -> str:
    """Tidy up messy text: remove weird spaces and too many blank lines."""
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _strip_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>", "\n", html)
    html = re.sub(r"<[^>]+>", " ", html)
    return html


def extract_from_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            reader.decrypt("")
        pages = []
        for number, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages.append(f"--- Page {number} ---\n{page_text}")
        return clean_text("\n\n".join(pages))
    except Exception as exc:  # corrupted or protected PDF
        raise ExtractionError(f"Could not read this PDF: {exc}") from exc


def extract_from_eml(data: bytes) -> str:
    """Read an .eml email file: keep subject/from/date + the message body."""
    try:
        msg = BytesParser(policy=policy.default).parsebytes(data)
    except Exception as exc:
        raise ExtractionError(f"Could not read this email file: {exc}") from exc

    header_lines = []
    for name in ("Subject", "From", "To", "Date"):
        if msg[name]:
            header_lines.append(f"{name}: {msg[name]}")

    body_part = msg.get_body(preferencelist=("plain", "html"))
    body = ""
    if body_part is not None:
        body = body_part.get_content()
        if body_part.get_content_type() == "text/html":
            body = _strip_html(body)

    attachments = [
        part.get_filename()
        for part in msg.iter_attachments()
        if part.get_filename()
    ]
    if attachments:
        header_lines.append("Attachments (names only): " + ", ".join(attachments))

    return clean_text("\n".join(header_lines) + "\n\n" + body)


def extract_from_upload(filename: str, data: bytes) -> tuple[str, str]:
    """Returns (source_type, text) based on the file extension."""
    if len(data) > MAX_FILE_BYTES:
        raise ExtractionError("File is too large (max 10 MB).")
    if not data:
        raise ExtractionError("The uploaded file is empty.")

    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "pdf", extract_from_pdf(data)
    if name.endswith(".eml"):
        return "email", extract_from_eml(data)
    if name.endswith((".txt", ".md", ".text")):
        return "text", clean_text(data.decode("utf-8", errors="ignore"))
    raise ExtractionError("Unsupported file type. Please upload a PDF, .eml or .txt file.")
