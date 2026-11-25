import secrets
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, GymnasticsLog, User, WorkoutSession, WorkoutTemplate
from app.security import hash_password

DEMO_EMAIL = "demo@tigran.app"

# (название, [(упражнение, подходы, повторы, вес)]) — None в повторах = упражнение на время
TEMPLATES: list[tuple[str, list[tuple[str, int | None, int | None, float | None]]]] = [
    (
        "Верх тела",
        [
            ("Тяга верхнего блока", 4, 10, 60.0),
            ("Жим штанги лёжа", 4, 8, 50.0),
            ("Планка", None, None, None),
        ],
    ),
    (
        "Спина и кор",
        [
            ("Тяга верхнего блока", 4, 12, 55.0),
            ("Планка", None, None, None),
            ("Кошка-корова", 2, 10, None),
        ],
    ),
    (
        "Гимнастика для спины",
        [
            ("Массаж спины мячиком", None, None, None),
            ("Кошка-корова", 2, 10, None),
            ("Растяжка в дверном проёме", None, None, None),
        ],
    ),
]

DURATION_DEFAULT = 60
# (дней назад, индекс шаблона)
HISTORY: list[tuple[int, int]] = [
    (42, 0),
    (38, 1),
    (35, 2),
    (31, 0),
    (28, 1),
    (24, 0),
    (21, 2),
    (17, 1),
    (14, 0),
    (10, 2),
    (6, 1),
    (3, 0),
]


async def _ensure_user(db: AsyncSession) -> User:
    user = await db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user is not None:
        return user

    user = User(
        email=DEMO_EMAIL,
        hashed_password=hash_password(secrets.token_urlsafe(24)),
        is_demo=True,
    )
    db.add(user)
    await db.flush()
    return user


async def seed_demo(db: AsyncSession) -> None:
    """Наполняет демо-аккаунт данными, если их ещё нет."""
    user = await _ensure_user(db)
    if await db.scalar(
        select(func.count()).select_from(WorkoutTemplate).where(WorkoutTemplate.user_id == user.id)
    ):
        return

    exercises = {exercise.name: exercise for exercise in await db.scalars(select(Exercise))}
    exercise_by_id = {exercise.id: exercise for exercise in exercises.values()}

    templates: list[WorkoutTemplate] = []
    for order_index, (name, entries) in enumerate(TEMPLATES):
        items: list[dict[str, object]] = []
        for exercise_name, sets, reps, weight in entries:
            exercise = exercises.get(exercise_name)
            if exercise is None:
                continue
            items.append(
                {
                    "exercise_id": exercise.id,
                    "target_sets": sets or 1,
                    "target_reps": reps,
                    "target_duration_sec": DURATION_DEFAULT if reps is None else None,
                    "target_weight": weight,
                }
            )
        if not items:
            continue
        template = WorkoutTemplate(
            user_id=user.id, name=name, order_index=order_index, exercises=items
        )
        db.add(template)
        templates.append(template)

    await db.flush()

    today = date.today()
    for offset, template_index in HISTORY:
        if template_index >= len(templates):
            continue
        template = templates[template_index]
        finished_at = datetime.combine(
            today - timedelta(days=offset), time(19, 30), tzinfo=timezone.utc
        )
        started_at = finished_at - timedelta(minutes=45)

        session_items: list[dict[str, object]] = []
        for entry in template.exercises:
            exercise = exercise_by_id.get(int(entry["exercise_id"]))
            reps = entry.get("target_reps")
            duration = entry.get("target_duration_sec")
            weight = entry.get("target_weight")

            sets_payload: list[dict[str, object]] = []
            if reps:
                sets_payload = [
                    {"weight": weight, "reps": reps},
                    {"weight": weight, "reps": reps},
                ]
            elif duration:
                sets_payload = [{"duration_sec": duration}]

            session_items.append(
                {
                    "exercise_id": entry["exercise_id"],
                    "name": exercise.name if exercise else "Упражнение удалено",
                    "metric_type": exercise.metric_type if exercise else "weight_reps",
                    "completed": True,
                    "notes": None,
                    "sets": sets_payload,
                    "target_sets": entry.get("target_sets"),
                    "target_reps": reps,
                    "target_duration_sec": duration,
                    "target_weight": weight,
                }
            )

        db.add(
            WorkoutSession(
                user_id=user.id,
                template_id=template.id,
                template_name=template.name,
                items=session_items,
                started_at=started_at,
                finished_at=finished_at,
            )
        )

    for offset in range(1, 15):
        if offset % 3 == 0:
            continue
        db.add(
            GymnasticsLog(
                user_id=user.id, log_date=today - timedelta(days=offset), completed=True
            )
        )
