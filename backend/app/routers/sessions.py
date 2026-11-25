from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Exercise, WorkoutSession, WorkoutTemplate
from app.schemas import (
    SessionAddItem,
    SessionCreate,
    SessionItemUpdate,
    SessionListItem,
    SessionRead,
    SessionSet,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def _owned_session(db: DbSession, session_id: int, user_id: int) -> WorkoutSession:
    session = await db.get(WorkoutSession, session_id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if session.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your session")
    return session


def _active_or_none(session: WorkoutSession) -> WorkoutSession:
    if session.finished_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Session already finished")
    return session


async def _exercises_by_id(db: DbSession, ids: list[int]) -> dict[int, Exercise]:
    if not ids:
        return {}
    result = await db.scalars(select(Exercise).where(Exercise.id.in_(ids)))
    return {exercise.id: exercise for exercise in result}


def _new_item(
    exercise_id: int,
    name: str,
    metric_type: str,
    target_sets: int | None = None,
    target_reps: int | None = None,
    target_duration_sec: int | None = None,
    target_weight: float | None = None,
) -> dict[str, object]:
    return {
        "exercise_id": exercise_id,
        "name": name,
        "metric_type": metric_type,
        "completed": False,
        "notes": None,
        "sets": [],
        "target_sets": target_sets,
        "target_reps": target_reps,
        "target_duration_sec": target_duration_sec,
        "target_weight": target_weight,
    }


def _check_sets(metric_type: str, sets: list[SessionSet]) -> None:
    for entry in sets:
        if metric_type == "time":
            if entry.duration_sec is None:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST, "duration_sec is required for time exercises"
                )
        elif entry.reps is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "reps is required")


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
async def start_session(
    payload: SessionCreate, db: DbSession, user: CurrentUser
) -> WorkoutSession:
    active = await db.scalar(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id, WorkoutSession.finished_at.is_(None)
        )
    )
    if active is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Session already in progress")

    items: list[dict[str, object]] = []
    template_name = "Свободная тренировка"

    if payload.template_id is not None:
        template = await db.get(WorkoutTemplate, payload.template_id)
        if template is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
        if template.user_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your template")

        template_name = template.name
        exercises = await _exercises_by_id(
            db, [item["exercise_id"] for item in template.exercises]
        )
        items = []
        for item in template.exercises:
            exercise = exercises.get(item["exercise_id"])
            items.append(
                _new_item(
                    item["exercise_id"],
                    exercise.name if exercise else "Упражнение удалено",
                    exercise.metric_type if exercise else "weight_reps",
                    item.get("target_sets"),
                    item.get("target_reps"),
                    item.get("target_duration_sec"),
                    item.get("target_weight"),
                )
            )

    session = WorkoutSession(
        user_id=user.id,
        template_id=payload.template_id,
        template_name=template_name,
        items=items,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/active", response_model=SessionRead | None)
async def active_session(db: DbSession, user: CurrentUser) -> WorkoutSession | None:
    return await db.scalar(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id, WorkoutSession.finished_at.is_(None)
        )
    )


@router.get("", response_model=list[SessionListItem])
async def list_sessions(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[SessionListItem]:
    sessions = list(
        await db.scalars(
            select(WorkoutSession)
            .where(
                WorkoutSession.user_id == user.id,
                WorkoutSession.finished_at.is_not(None),
            )
            .order_by(WorkoutSession.finished_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )

    exercise_ids = {item["exercise_id"] for session in sessions for item in session.items}
    category_by_exercise: dict[int, int] = {}
    if exercise_ids:
        rows = await db.execute(
            select(Exercise.id, Exercise.category_id).where(Exercise.id.in_(exercise_ids))
        )
        category_by_exercise = {row[0]: row[1] for row in rows}

    result: list[SessionListItem] = []
    for session in sessions:
        if session.finished_at is None:
            continue
        tonnage = sum(
            (entry.get("weight") or 0) * (entry.get("reps") or 0)
            for item in session.items
            for entry in item.get("sets", [])
        )
        result.append(
            SessionListItem(
                id=session.id,
                template_name=session.template_name,
                finished_at=session.finished_at,
                total_items=len(session.items),
                completed_items=sum(1 for item in session.items if item.get("completed")),
                duration_min=max(
                    1,
                    round(
                        (session.finished_at - session.started_at).total_seconds() / 60
                    ),
                ),
                tonnage=round(tonnage, 1),
                category_ids=sorted(
                    {
                        category_by_exercise[item["exercise_id"]]
                        for item in session.items
                        if item["exercise_id"] in category_by_exercise
                    }
                ),
            )
        )
    return result


@router.get("/{session_id}", response_model=SessionRead)
async def get_session(session_id: int, db: DbSession, user: CurrentUser) -> WorkoutSession:
    return await _owned_session(db, session_id, user.id)


@router.post("/{session_id}/items", response_model=SessionRead)
async def add_item(
    session_id: int, payload: SessionAddItem, db: DbSession, user: CurrentUser
) -> WorkoutSession:
    session = _active_or_none(await _owned_session(db, session_id, user.id))

    exercise = await db.get(Exercise, payload.exercise_id)
    if exercise is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown exercise")

    session.items = [*session.items, _new_item(exercise.id, exercise.name, exercise.metric_type)]
    await db.commit()
    await db.refresh(session)
    return session


@router.patch("/{session_id}/items/{index}", response_model=SessionRead)
async def update_item(
    session_id: int, index: int, payload: SessionItemUpdate, db: DbSession, user: CurrentUser
) -> WorkoutSession:
    session = _active_or_none(await _owned_session(db, session_id, user.id))

    items = list(session.items)
    if index < 0 or index >= len(items):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")

    item = dict(items[index])
    if payload.completed is not None:
        item["completed"] = payload.completed
    if "notes" in payload.model_fields_set:
        item["notes"] = payload.notes
    if "sets" in payload.model_fields_set:
        sets = payload.sets or []
        _check_sets(str(item.get("metric_type", "weight_reps")), sets)
        item["sets"] = [entry.model_dump(exclude_none=True) for entry in sets]

    items[index] = item
    session.items = items
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/{session_id}/finish", response_model=SessionRead)
async def finish_session(session_id: int, db: DbSession, user: CurrentUser) -> WorkoutSession:
    session = await _owned_session(db, session_id, user.id)
    if session.finished_at is None:
        session.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(session)
    return session
