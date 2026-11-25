import asyncio

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import User
from app.storage import prune_orphans


async def main() -> None:
    async with SessionLocal() as db:
        admin = await db.scalar(select(User).where(User.email == settings.admin_email))
        if admin is None:
            print("Admin not found")
            return
        removed = await prune_orphans(db, admin.id)

    if not removed:
        print("Nothing to remove")
        return

    print(f"Removed {len(removed)} files:")
    for path in removed:
        print(" ", path)


if __name__ == "__main__":
    asyncio.run(main())
