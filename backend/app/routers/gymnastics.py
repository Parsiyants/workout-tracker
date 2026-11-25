from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession
from app.models import Exercise, GymnasticsLog, GymnasticsProgram
from app.schemas import (
    GymnasticsLogRead,
    GymnasticsLogUpdate,
    GymnasticsProgramCreate,
    GymnasticsProgramRead,
    GymnasticsProgramUpdate,
    TemplateItem,
    TemplateOrder,
)

router = APIRouter(prefix="/gymnastics", tags=["gymnastics"])


async def _validate_exercises(db: DbSession, items: list[TemplateItem]) -> None:
    ids = {item.exercise_id for item in items}
    if not ids:
        return
    found = set(await db.scalars(select(Exercise.id).where(Exercise.id.in_(ids))))
    missing = ids - found
    if missing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown exercise: {min(missing)}")


def _as_json(items: list[TemplateItem]) -> list[dict[str, object]]:
    return [item.model_dump() for item in items]


async def _owned_program(db: DbSession, program_id: int, user_id: int) -> GymnasticsProgram:
    program = await db.get(GymnasticsProgram, program_id)
    if program is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
    if program.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your program")
    return program


@router.get("/programs", response_model=list[GymnasticsProgramRead])
async def list_programs(db: DbSession, user: CurrentUser) -> list[GymnasticsProgram]:
    result = await db.scalars(
        select(GymnasticsProgram)
        .where(GymnasticsProgram.user_id == user.id)
        .order_by(GymnasticsProgram.order_index, GymnasticsProgram.id)
    )
    return list(result)


@router.post(
    "/programs", response_model=GymnasticsProgramRead, status_code=status.HTTP_201_CREATED
)
async def create_program(
    payload: GymnasticsProgramCreate, db: DbSession, user: CurrentUser
) -> GymnasticsProgram:
    await _validate_exercises(db, payload.exercises)

    last_order = await db.scalar(
        select(func.max(GymnasticsProgram.order_index)).where(GymnasticsProgram.user_id == user.id)
    )
    program = GymnasticsProgram(
        user_id=user.id,
        name=payload.name.strip(),
        order_index=(last_order or 0) + 1,
        exercises=_as_json(payload.exercises),
    )
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program


@router.put("/programs/order", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_programs(payload: TemplateOrder, db: DbSession, user: CurrentUser) -> None:
    programs = {
        program.id: program
        for program in await db.scalars(
            select(GymnasticsProgram).where(GymnasticsProgram.user_id == user.id)
        )
    }
    if set(payload.ids) != set(programs):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Send all your program ids")

    for index, program_id in enumerate(payload.ids):
        programs[program_id].order_index = index
    await db.commit()


@router.get("/programs/{program_id}", response_model=GymnasticsProgramRead)
async def get_program(program_id: int, db: DbSession, user: CurrentUser) -> GymnasticsProgram:
    return await _owned_program(db, program_id, user.id)


@router.patch("/programs/{program_id}", response_model=GymnasticsProgramRead)
async def update_program(
    program_id: int, payload: GymnasticsProgramUpdate, db: DbSession, user: CurrentUser
) -> GymnasticsProgram:
    program = await _owned_program(db, program_id, user.id)

    if payload.name is not None:
        program.name = payload.name.strip()
    if payload.exercises is not None:
        await _validate_exercises(db, payload.exercises)
        program.exercises = _as_json(payload.exercises)

    await db.commit()
    await db.refresh(program)
    return program


@router.delete("/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(program_id: int, db: DbSession, user: CurrentUser) -> None:
    program = await _owned_program(db, program_id, user.id)
    await db.delete(program)
    await db.commit()


@router.get("/logs", response_model=list[GymnasticsLogRead])
async def list_logs(
    db: DbSession,
    user: CurrentUser,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
) -> list[GymnasticsLog]:
    stmt = select(GymnasticsLog).where(GymnasticsLog.user_id == user.id)
    if date_from is not None:
        stmt = stmt.where(GymnasticsLog.log_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(GymnasticsLog.log_date <= date_to)
    return list(await db.scalars(stmt.order_by(GymnasticsLog.log_date)))


@router.put("/logs/{log_date}", response_model=GymnasticsLogRead)
async def upsert_log(
    log_date: date, payload: GymnasticsLogUpdate, db: DbSession, user: CurrentUser
) -> GymnasticsLog:
    log = await db.scalar(
        select(GymnasticsLog).where(
            GymnasticsLog.user_id == user.id, GymnasticsLog.log_date == log_date
        )
    )
    if log is None:
        log = GymnasticsLog(user_id=user.id, log_date=log_date, **payload.model_dump())
        db.add(log)
    else:
        log.completed = payload.completed
        log.notes = payload.notes

    await db.commit()
    await db.refresh(log)
    return log
