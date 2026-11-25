import asyncio
import json
import urllib.request
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Category, Exercise
from app.security import create_access_token

FILES_PREFIX = "/files/"
PROTECTED_FOLDERS = ("exercises",)


def _relative_path(url: str) -> str | None:
    path = urlparse(url).path
    if not path.startswith(FILES_PREFIX):
        return None
    relative = path[len(FILES_PREFIX) :]
    return relative or None


def _post_json(url: str, payload: dict[str, object], token: str) -> dict[str, object]:
    body = json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read())


async def prune_orphans(db: AsyncSession, user_id: int) -> list[str]:
    """Удаляет файлы storage, на которые не ссылается ни одно упражнение/категория."""
    keep: list[str] = []

    for exercise in await db.scalars(select(Exercise)):
        for item in exercise.media:
            relative = _relative_path(str(item.get("url", "")))
            if relative:
                keep.append(relative)

    for category in await db.scalars(select(Category)):
        if category.image_url:
            relative = _relative_path(category.image_url)
            if relative:
                keep.append(relative)

    folders: dict[str, list[str]] = {folder: [] for folder in PROTECTED_FOLDERS}
    for relative in keep:
        folder, _, _name = relative.partition("/")
        if folder:
            folders.setdefault(folder, []).append(relative)

    token = create_access_token(user_id, True)
    removed: list[str] = []
    for folder, paths in folders.items():
        result = await asyncio.to_thread(
            _post_json,
            f"{settings.storage_url}/files/prune",
            {"folder": folder, "keep": paths},
            token,
        )
        removed.extend(result.get("removed", []))  # type: ignore[arg-type]

    return removed
