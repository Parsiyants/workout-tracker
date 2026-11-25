from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.deps import AdminUser, CurrentUser, DbSession
from app.models import Category, Exercise, WorkoutSession, WorkoutTemplate
from app.schemas import ExerciseCreate, ExerciseRead, ExerciseUpdate

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
async def list_exercises(
    db: DbSession,
    _: CurrentUser,
    category_id: int | None = None,
    search: str | None = None,
) -> list[Exercise]:
    stmt = select(Exercise).order_by(Exercise.name)
    if category_id is not None:
        stmt = stmt.where(Exercise.category_id == category_id)
    if search:
        stmt = stmt.where(Exercise.name.ilike(f"%{search.strip()}%"))
    result = await db.scalars(stmt)
    return list(result)


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(exercise_id: int, db: DbSession, _: CurrentUser) -> Exercise:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
    return exercise


@router.post("", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
async def create_exercise(payload: ExerciseCreate, db: DbSession, _: CurrentUser) -> Exercise:
    if await db.get(Category, payload.category_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown category")

    exercise = Exercise(**payload.model_dump())
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.patch("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: int, payload: ExerciseUpdate, db: DbSession, _: CurrentUser
) -> Exercise:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")

    changes = payload.model_dump(exclude_unset=True)
    if "category_id" in changes and await db.get(Category, changes["category_id"]) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown category")

    for field, value in changes.items():
        setattr(exercise, field, value)

    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(exercise_id: int, db: DbSession, _: AdminUser) -> None:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")

    probe = [{"exercise_id": exercise_id}]
    used_in_templates = await db.scalar(
        select(func.count()).select_from(WorkoutTemplate).where(WorkoutTemplate.exercises.contains(probe))
    )
    used_in_sessions = await db.scalar(
        select(func.count()).select_from(WorkoutSession).where(WorkoutSession.items.contains(probe))
    )
    if used_in_templates or used_in_sessions:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Exercise is used in templates or sessions"
        )

    await db.delete(exercise)
    await db.commit()
