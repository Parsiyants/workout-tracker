import jwt
from fastapi import Header, HTTPException, status

from app.config import settings

ALGORITHM = "HS256"


async def require_user(authorization: str | None = Header(default=None)) -> None:
    """Проверяет JWT приложения. Любой авторизованный пользователь может работать с файлами."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    try:
        jwt.decode(authorization.removeprefix("Bearer "), settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
