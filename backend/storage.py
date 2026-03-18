from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import AsyncIterator

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse


class MediaStorageAdapter(ABC):
    @abstractmethod
    def save_bytes(self, *, data: bytes, file_id: str, file_ext: str) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def save_upload_file(
        self,
        *,
        upload_file: UploadFile,
        file_id: str,
        file_ext: str,
        max_bytes: int,
    ) -> dict:
        raise NotImplementedError

    @abstractmethod
    def exists(self, upload_doc: dict) -> bool:
        raise NotImplementedError

    @abstractmethod
    def read_bytes(self, upload_doc: dict) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, upload_doc: dict) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_suffix(self, upload_doc: dict) -> str:
        raise NotImplementedError

    @abstractmethod
    def stream_response(self, upload_doc: dict, *, media_type: str | None = None, filename: str | None = None) -> FileResponse:
        raise NotImplementedError

    @abstractmethod
    @asynccontextmanager
    async def local_path_for_processing(self, upload_doc: dict) -> AsyncIterator[Path]:
        raise NotImplementedError

    @abstractmethod
    def create_temp_path(self, suffix: str) -> Path:
        raise NotImplementedError


class LocalMediaStorage(MediaStorageAdapter):
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _path_for(self, file_id: str, file_ext: str) -> Path:
        ext = (file_ext or "").lower()
        return self.root_dir / f"{file_id}{ext}"

    def _path_from_doc(self, upload_doc: dict) -> Path:
        storage_key = str(upload_doc.get("storage_key") or "").strip()
        if storage_key:
            return self.root_dir / storage_key
        path_raw = str(upload_doc.get("file_path") or "").strip()
        if path_raw:
            return Path(path_raw)
        stored_filename = str(upload_doc.get("stored_filename") or "").strip()
        if stored_filename:
            return self.root_dir / stored_filename
        raise FileNotFoundError("Upload path metadata is missing.")

    def save_bytes(self, *, data: bytes, file_id: str, file_ext: str) -> dict:
        path = self._path_for(file_id, file_ext)
        path.write_bytes(data)
        return {
            "storage_backend": "local",
            "storage_key": path.name,
            "stored_filename": path.name,
            "file_path": str(path),
            "file_size": len(data),
        }

    async def save_upload_file(
        self,
        *,
        upload_file: UploadFile,
        file_id: str,
        file_ext: str,
        max_bytes: int,
    ) -> dict:
        path = self._path_for(file_id, file_ext)
        total_bytes = 0
        chunk_size = 1024 * 1024
        with open(path, "wb") as buffer:
            while True:
                chunk = await upload_file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    buffer.close()
                    try:
                        path.unlink(missing_ok=True)
                    except Exception:
                        pass
                    raise HTTPException(status_code=400, detail=f"File is too large. Max size is {max_bytes // (1024 * 1024)}MB.")
                buffer.write(chunk)

        return {
            "storage_backend": "local",
            "storage_key": path.name,
            "stored_filename": path.name,
            "file_path": str(path),
            "file_size": total_bytes,
        }

    def exists(self, upload_doc: dict) -> bool:
        try:
            return self._path_from_doc(upload_doc).exists()
        except FileNotFoundError:
            return False

    def read_bytes(self, upload_doc: dict) -> bytes:
        return self._path_from_doc(upload_doc).read_bytes()

    def delete(self, upload_doc: dict) -> None:
        try:
            self._path_from_doc(upload_doc).unlink(missing_ok=True)
        except FileNotFoundError:
            return

    def get_suffix(self, upload_doc: dict) -> str:
        try:
            return self._path_from_doc(upload_doc).suffix.lower()
        except FileNotFoundError:
            storage_key = str(upload_doc.get("storage_key") or upload_doc.get("stored_filename") or "").strip()
            return Path(storage_key).suffix.lower()

    def stream_response(self, upload_doc: dict, *, media_type: str | None = None, filename: str | None = None) -> FileResponse:
        path = self._path_from_doc(upload_doc)
        return FileResponse(path, media_type=media_type, filename=filename or path.name)

    @asynccontextmanager
    async def local_path_for_processing(self, upload_doc: dict) -> AsyncIterator[Path]:
        yield self._path_from_doc(upload_doc)

    def create_temp_path(self, suffix: str) -> Path:
        with NamedTemporaryFile(delete=False, suffix=suffix, dir=self.root_dir) as temp_file:
            return Path(temp_file.name)


def build_media_storage() -> MediaStorageAdapter:
    default_root = Path(__file__).parent / "uploads"
    configured_root = Path(os.environ.get("UPLOADS_DIR", str(default_root)))
    backend = (os.environ.get("MEDIA_STORAGE_BACKEND", "local") or "local").strip().lower()
    if backend != "local":
        raise RuntimeError(f"Unsupported MEDIA_STORAGE_BACKEND={backend}. Only local is implemented in this phase.")
    return LocalMediaStorage(configured_root)


media_storage = build_media_storage()
