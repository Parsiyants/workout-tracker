from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AdminUser, CurrentUser, DbSession
from app.models import Category
from app.schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
async def list_categories(db: DbSession, _: CurrentUser) -> list[Category]:
    result = await db.scalars(select(Category).order_by(Category.order_index, Category.id))
    return list(result)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, db: DbSession, _: AdminUser) -> Category:
    if payload.parent_id is not None and await db.get(Category, payload.parent_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown parent category")

    category = Category(**payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int, payload: CategoryUpdate, db: DbSession, _: AdminUser
) -> Category:
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")

    changes = payload.model_dump(exclude_unset=True)
    parent_id = changes.get("parent_id")
    if parent_id is not None:
        if parent_id == category_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Category cannot be its own parent")
        if await db.get(Category, parent_id) is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown parent category")

    for field, value in changes.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category
