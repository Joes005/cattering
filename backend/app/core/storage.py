"""Pluggable file storage. `LocalDiskStorage` is the dev implementation;
swapping in an S3-backed one later only means implementing the same
`save()` signature and pointing `storage` at it — callers never change."""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".xls", ".xlsx"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


class LocalDiskStorage:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, file: UploadFile, subdir: str) -> str:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File type '{ext}' is not allowed")

        target_dir = self.base_dir / subdir
        target_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{uuid.uuid4().hex}{ext}"
        destination = target_dir / filename

        size = 0
        with destination.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    destination.unlink(missing_ok=True)
                    raise ValueError("File exceeds the 10 MB upload limit")
                out.write(chunk)

        return f"/files/{subdir}/{filename}"


storage = LocalDiskStorage(settings.UPLOAD_DIR)
