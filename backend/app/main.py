from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.routers import (
    admin,
    analytics,
    auth,
    categories,
    exercises,
    gymnastics,
    sessions,
    templates,
)
from app.security import decode_claims

app = FastAPI(title="tigran_tracker API")

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@app.middleware("http")
async def demo_read_only(request: Request, call_next):
    """Демо-аккаунт может только читать; вход/регистрация не ограничиваются."""
    if request.method not in SAFE_METHODS and not request.url.path.startswith("/api/auth/"):
        header = request.headers.get("authorization", "")
        if header.startswith("Bearer "):
            claims = decode_claims(header[7:])
            if claims is not None and claims.get("demo") is True:
                return JSONResponse(
                    {"detail": "Demo mode: read-only"}, status_code=403
                )
    return await call_next(request)

app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(exercises.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(gymnastics.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
