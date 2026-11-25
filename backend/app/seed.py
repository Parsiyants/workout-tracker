import asyncio

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import SessionLocal
from app.models import Category, Exercise, GymnasticsProgram, User
from app.security import hash_password
from app.seed_demo import seed_demo
from app.seed_plan import seed_plan

# Корневые группы: (название, slug, ключи мышц для SVG)
ROOTS: list[tuple[str, str, list[str]]] = [
    ("Грудь", "chest", ["chest"]),
    ("Спина", "back", ["lats", "traps", "mid_back", "lower_back"]),
    ("Плечи", "shoulders", ["front_delts", "rear_delts"]),
    ("Руки", "arms", ["biceps", "triceps", "forearms"]),
    ("Ноги", "legs", ["quads", "hamstrings", "glutes", "calves"]),
    ("Кор", "core", ["abs", "obliques"]),
    ("Гимнастика", "gymnastics", []),
    ("Кардио", "cardio", []),
]

# Подкатегории: (родительский slug, название, slug, ключи мышц)
CHILDREN: list[tuple[str, str, str, list[str]]] = [
    ("chest", "Грудные", "chest-main", ["chest"]),
    ("back", "Широчайшие", "lats", ["lats"]),
    ("back", "Трапеции", "traps", ["traps"]),
    ("back", "Средняя часть спины", "mid-back", ["mid_back"]),
    ("back", "Поясница", "lower-back", ["lower_back"]),
    ("shoulders", "Передние дельты", "front-delts", ["front_delts"]),
    ("shoulders", "Задние дельты", "rear-delts", ["rear_delts"]),
    ("arms", "Бицепс", "biceps", ["biceps"]),
    ("arms", "Трицепс", "triceps", ["triceps"]),
    ("arms", "Предплечья", "forearms", ["forearms"]),
    ("core", "Пресс", "abs", ["abs"]),
    ("core", "Косые мышцы живота", "obliques", ["obliques"]),
    ("legs", "Квадрицепсы", "quads", ["quads"]),
    ("legs", "Задняя поверхность бедра", "hamstrings", ["hamstrings"]),
    ("legs", "Ягодицы", "glutes", ["glutes"]),
    ("legs", "Икры", "calves", ["calves"]),
]


async def _upsert_category(
    db: AsyncSession,
    *,
    name: str,
    slug: str,
    parent_id: int | None,
    muscle_keys: list[str],
    order_index: int,
) -> Category:
    category = await db.scalar(select(Category).where(Category.slug == slug))
    if category is None:
        category = Category(
            name=name,
            slug=slug,
            parent_id=parent_id,
            muscle_keys=muscle_keys,
            order_index=order_index,
        )
        db.add(category)
        await db.flush()
        return category

    category.name = name
    category.parent_id = parent_id
    category.muscle_keys = muscle_keys
    category.order_index = order_index
    return category


GYMNASTICS_EXERCISES: list[tuple[str, str, str]] = [
    (
        "Массаж спины мячиком",
        "time",
        "Мяч между спиной и стеной, медленно прокатывать вдоль позвоночника.",
    ),
    ("Кошка-корова", "reps", "На четвереньках: прогиб и округление спины в медленном темпе."),
    ("Растяжка в дверном проёме", "time", "Руки на косяк, шаг вперёд, раскрыть грудной отдел."),
]


async def _ensure_gymnastics(
    db: AsyncSession, gymnastics_id: int, admin: User
) -> None:
    """Создаёт базовые упражнения и программу гимнастики, если их ещё нет."""
    exercises = list(
        await db.scalars(select(Exercise).where(Exercise.category_id == gymnastics_id))
    )
    if not exercises:
        exercises = [
            Exercise(
                name=name,
                description=description,
                category_id=gymnastics_id,
                metric_type=metric_type,
            )
            for name, metric_type, description in GYMNASTICS_EXERCISES
        ]
        db.add_all(exercises)
        await db.flush()

    has_program = await db.scalar(
        select(func.count())
        .select_from(GymnasticsProgram)
        .where(GymnasticsProgram.user_id == admin.id)
    )
    if has_program or not exercises:
        return

    db.add(
        GymnasticsProgram(
            user_id=admin.id,
            name="Гимнастика для спины",
            order_index=1,
            exercises=[
                {
                    "exercise_id": exercise.id,
                    "target_sets": 1,
                    "target_reps": 10 if exercise.metric_type == "reps" else None,
                    "target_duration_sec": 120 if exercise.metric_type == "time" else None,
                    "target_weight": None,
                }
                for exercise in exercises
            ],
        )
    )


async def main() -> None:
    async with SessionLocal() as db:
        roots: dict[str, Category] = {}
        for index, (name, slug, muscle_keys) in enumerate(ROOTS):
            roots[slug] = await _upsert_category(
                db,
                name=name,
                slug=slug,
                parent_id=None,
                muscle_keys=muscle_keys,
                order_index=index,
            )

        for index, (parent_slug, name, slug, muscle_keys) in enumerate(CHILDREN):
            await _upsert_category(
                db,
                name=name,
                slug=slug,
                parent_id=roots[parent_slug].id,
                muscle_keys=muscle_keys,
                order_index=index,
            )

        admin = await db.scalar(select(User).where(User.email == settings.admin_email))
        if admin is None:
            admin = User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                is_admin=True,
            )
            db.add(admin)
            await db.flush()
        elif not admin.is_admin:
            admin.is_admin = True

        await _ensure_gymnastics(db, roots["gymnastics"].id, admin)
        await seed_plan(db, admin)
        await seed_demo(db)
        await db.commit()


if __name__ == "__main__":
    asyncio.run(main())
