import jwt
from fastapi import Header, HTTPException, status

from app.config import settings

ALGORITHM = "HS256"


async def require_admin(authorization: str | None = Header(default=None)) -> None:
    """Проверяет JWT приложения и требует claim adm=true (без обращения к БД)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    try:
        payload = jwt.decode(authorization.removeprefix("Bearer "), settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    if payload.get("adm") is not True:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
