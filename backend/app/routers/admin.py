from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminUser, DbSession
from app.models import User
from app.schemas import PruneResult, UserRead
from app.storage import prune_orphans

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserRead])
async def list_users(db: DbSession, _: AdminUser) -> list[User]:
    result = await db.scalars(select(User).order_by(User.created_at))
    return list(result)


@router.post("/storage/prune", response_model=PruneResult)
async def prune_storage(db: DbSession, admin: AdminUser) -> PruneResult:
    try:
        removed = await prune_orphans(db, admin.id)
    except OSError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Storage unavailable: {exc}") from exc
    return PruneResult(removed=removed)
