import os
import tempfile
from pathlib import Path


def parse_uploaded_file(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".txt":
        return file_bytes.decode("utf-8", errors="replace")
    elif ext == ".pdf":
        return _parse_pdf(file_bytes)
    elif ext == ".docx":
        return _parse_docx(file_bytes)
    else:
        raise ValueError(f"Không hỗ trợ định dạng {ext}")


def _parse_pdf(file_bytes: bytes) -> str:
    from pypdf import PdfReader
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def _parse_docx(file_bytes: bytes) -> str:
    from docx import Document
    import io
    doc = Document(io.BytesIO(file_bytes))
    paras = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paras)
