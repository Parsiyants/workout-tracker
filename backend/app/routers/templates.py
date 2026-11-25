from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession
from app.models import Exercise, WorkoutSession, WorkoutTemplate
from app.schemas import TemplateCreate, TemplateItem, TemplateOrder, TemplateRead, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


async def _validate_exercises(db: DbSession, items: list[TemplateItem]) -> None:
    ids = {item.exercise_id for item in items}
    if not ids:
        return
    found = set(await db.scalars(select(Exercise.id).where(Exercise.id.in_(ids))))
    missing = ids - found
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Unknown exercise: {min(missing)}"
        )


def _as_json(items: list[TemplateItem]) -> list[dict[str, object]]:
    return [item.model_dump() for item in items]


async def _owned_template(db: DbSession, template_id: int, user_id: int) -> WorkoutTemplate:
    template = await db.get(WorkoutTemplate, template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    if template.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your template")
    return template


def _user_templates_stmt(user_id: int):
    return (
        select(WorkoutTemplate)
        .where(WorkoutTemplate.user_id == user_id)
        .order_by(WorkoutTemplate.order_index, WorkoutTemplate.id)
    )


@router.get("", response_model=list[TemplateRead])
async def list_templates(db: DbSession, user: CurrentUser) -> list[WorkoutTemplate]:
    return list(await db.scalars(_user_templates_stmt(user.id)))


@router.get("/recommended", response_model=TemplateRead)
async def recommended_template(db: DbSession, user: CurrentUser) -> WorkoutTemplate:
    """Первый шаблон по order_index после последнего завершённого; иначе — первый."""
    templates = list(await db.scalars(_user_templates_stmt(user.id)))
    if not templates:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No templates yet")

    last_template_id = await db.scalar(
        select(WorkoutSession.template_id)
        .where(WorkoutSession.user_id == user.id, WorkoutSession.finished_at.is_not(None))
        .order_by(WorkoutSession.finished_at.desc())
        .limit(1)
    )
    if last_template_id is None:
        return templates[0]

    last = next((item for item in templates if item.id == last_template_id), None)
    if last is None:
        return templates[0]

    return next(
        (item for item in templates if item.order_index > last.order_index), templates[0]
    )


@router.post("", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TemplateCreate, db: DbSession, user: CurrentUser
) -> WorkoutTemplate:
    await _validate_exercises(db, payload.exercises)

    last_order = await db.scalar(
        select(func.max(WorkoutTemplate.order_index)).where(WorkoutTemplate.user_id == user.id)
    )
    template = WorkoutTemplate(
        user_id=user.id,
        name=payload.name.strip(),
        order_index=(last_order or 0) + 1,
        exercises=_as_json(payload.exercises),
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/order", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_templates(payload: TemplateOrder, db: DbSession, user: CurrentUser) -> None:
    templates = {
        template.id: template
        for template in await db.scalars(
            select(WorkoutTemplate).where(WorkoutTemplate.user_id == user.id)
        )
    }
    if set(payload.ids) != set(templates):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Send all your template ids")

    for index, template_id in enumerate(payload.ids):
        templates[template_id].order_index = index
    await db.commit()


@router.patch("/{template_id}", response_model=TemplateRead)
async def update_template(
    template_id: int, payload: TemplateUpdate, db: DbSession, user: CurrentUser
) -> WorkoutTemplate:
    template = await _owned_template(db, template_id, user.id)

    if payload.name is not None:
        template.name = payload.name.strip()
    if payload.exercises is not None:
        await _validate_exercises(db, payload.exercises)
        template.exercises = _as_json(payload.exercises)

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: int, db: DbSession, user: CurrentUser) -> None:
    template = await _owned_template(db, template_id, user.id)
    await db.delete(template)
    await db.commit()
