import re
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.auth import require_user
from app.config import settings

FOLDER_RE = re.compile(r"^[a-z0-9_-]{1,40}$")
EXT_RE = re.compile(r"^[a-z0-9]{1,5}$")


class StoredFile(BaseModel):
    name: str
    url: str
    size: int
    content_type: str


class UploadResult(BaseModel):
    files: list[StoredFile]


class RemoveRequest(BaseModel):
    paths: list[str]


class PruneRequest(BaseModel):
    folder: str
    keep: list[str] = []


app = FastAPI(title="tigran_tracker storage")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allowed_origins.split(",")],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def resolve_path(relative: str) -> Path:
    """Путь внутри STORAGE_DIR; выход наружу (path traversal) — 400."""
    root = settings.storage_dir.resolve()
    candidate = (root / relative).resolve()
    if candidate != root and root not in candidate.parents:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")
    return candidate


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/files", response_model=UploadResult, status_code=status.HTTP_201_CREATED)
async def upload_files(
    folder: str = Query(..., description="Подпапка, например exercises"),
    files: list[UploadFile] = File(...),
    _: None = Depends(require_user),
) -> UploadResult:
    if not FOLDER_RE.match(folder):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid folder")

    target_dir = resolve_path(folder)
    target_dir.mkdir(parents=True, exist_ok=True)

    limit = settings.max_file_mb * 1024 * 1024
    stored: list[StoredFile] = []

    for file in files:
        extension = Path(file.filename or "").suffix.lower().lstrip(".")
        if not EXT_RE.match(extension):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Bad file name: {file.filename}")

        content_type = file.content_type or ""
        if not content_type.startswith(("image/", "video/")):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported content type: {content_type}")

        content = await file.read()
        if len(content) > limit:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File is too large")

        name = f"{uuid.uuid4().hex}.{extension}"
        await run_in_threadpool((target_dir / name).write_bytes, content)

        stored.append(
            StoredFile(
                name=name,
                url=f"{settings.public_base_url}/files/{folder}/{name}",
                size=len(content),
                content_type=content_type,
            )
        )

    return UploadResult(files=stored)


@app.get("/files/{path:path}")
async def read_file(path: str) -> FileResponse:
    file_path = resolve_path(path)
    if not file_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    # Имена файлов — uuid, содержимое неизменяемо: кэшируем надолго
    return FileResponse(
        file_path,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.delete("/files")
async def remove_files(payload: RemoveRequest, _: None = Depends(require_user)) -> dict[str, list[str]]:
    removed: list[str] = []
    for relative in payload.paths:
        file_path = resolve_path(relative)
        if file_path.is_file():
            file_path.unlink()
            removed.append(relative)
    return {"removed": removed}


@app.post("/files/prune")
async def prune_files(
    payload: PruneRequest, _: None = Depends(require_user)
) -> dict[str, list[str]]:
    """Удаляет файлы папки, на которые больше нет ссылок (keep)."""
    if not FOLDER_RE.match(payload.folder):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid folder")

    target_dir = resolve_path(payload.folder)
    if not target_dir.is_dir():
        return {"removed": []}

    keep = set(payload.keep)
    removed: list[str] = []
    for file_path in sorted(target_dir.iterdir()):
        if not file_path.is_file():
            continue
        relative = f"{payload.folder}/{file_path.name}"
        if relative not in keep:
            file_path.unlink()
            removed.append(relative)
    return {"removed": removed}
