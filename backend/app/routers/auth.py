import time

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.deps import AdminUser, CurrentUser, DbSession
from app.models import User
from app.schemas import LoginRequest, Token, UserCreate, UserRead
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_EMAIL = "demo@tigran.app"
DEMO_LIMIT = 10
DEMO_WINDOW_SEC = 60.0
_demo_attempts: dict[str, list[float]] = {}


def _check_demo_rate(key: str) -> None:
    now = time.time()
    attempts = [value for value in _demo_attempts.get(key, []) if now - value < DEMO_WINDOW_SEC]
    if len(attempts) >= DEMO_LIMIT:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many demo requests")
    attempts.append(now)
    _demo_attempts[key] = attempts


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: DbSession, _: AdminUser) -> User:
    """Создание пользователя админом. Публичной регистрации нет."""
    email = payload.email.strip().lower()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: DbSession) -> Token:
    email = payload.email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return Token(access_token=create_access_token(user.id, user.is_admin, user.is_demo))


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> User:
    return user


@router.post("/demo", response_model=Token)
async def demo_login(request: Request, db: DbSession) -> Token:
    """Токен демо-аккаунта (только чтение)."""
    _check_demo_rate(request.client.host if request.client else "unknown")
    user = await db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Demo account is not seeded")
    return Token(access_token=create_access_token(user.id, False, True))
