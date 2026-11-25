from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Query
from sqlalchemy import func, select, text

from app.deps import CurrentUser, DbSession
from app.models import Category, Exercise, GymnasticsLog, WorkoutSession
from app.schemas import (
    AnalyticsExercise,
    AnalyticsSummary,
    ExerciseRecord,
    ExerciseWeightPoint,
    FrequencyPoint,
    MuscleBalanceItem,
    VolumePoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _week_start(value: date) -> date:
    return value - timedelta(days=value.weekday())


async def _finished_sessions(
    db: DbSession, user_id: int, since: datetime
) -> list[WorkoutSession]:
    result = await db.scalars(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.finished_at.is_not(None),
            WorkoutSession.finished_at >= since,
        )
    )
    return list(result)


def _tonnage(session: WorkoutSession) -> float:
    return sum(
        (entry.get("weight") or 0) * (entry.get("reps") or 0)
        for item in session.items
        for entry in item.get("sets", [])
    )


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(db: DbSession, user: CurrentUser) -> AnalyticsSummary:
    today = date.today()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=6)
    month_start_dt = datetime.combine(month_start, time.min, tzinfo=timezone.utc)
    week_start_dt = datetime.combine(week_start, time.min, tzinfo=timezone.utc)

    sessions = list(
        await db.scalars(
            select(WorkoutSession).where(
                WorkoutSession.user_id == user.id,
                WorkoutSession.finished_at.is_not(None),
                WorkoutSession.finished_at >= month_start_dt,
            )
        )
    )

    workouts_week = sum(
        1 for session in sessions if session.finished_at and session.finished_at >= week_start_dt
    )
    total_items = sum(len(session.items) for session in sessions)
    completed_items = sum(
        1 for session in sessions for item in session.items if item.get("completed")
    )
    filled_items = sum(1 for session in sessions for item in session.items if item.get("sets"))
    durations = [
        (session.finished_at - session.started_at).total_seconds() / 60
        for session in sessions
        if session.finished_at is not None
    ]

    gymnastics_days = (
        await db.scalar(
            select(func.count())
            .select_from(GymnasticsLog)
            .where(
                GymnasticsLog.user_id == user.id,
                GymnasticsLog.completed.is_(True),
                GymnasticsLog.log_date >= month_start,
            )
        )
        or 0
    )

    log_dates = list(
        await db.scalars(
            select(GymnasticsLog.log_date)
            .where(GymnasticsLog.user_id == user.id, GymnasticsLog.completed.is_(True))
            .order_by(GymnasticsLog.log_date.desc())
        )
    )
    streak = 0
    expected = today
    for log_date in log_dates:
        if log_date == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif log_date < expected:
            break

    return AnalyticsSummary(
        workouts_week=workouts_week,
        workouts_month=len(sessions),
        avg_duration_min=round(sum(durations) / len(durations)) if durations else 0,
        completion_rate=round(completed_items / total_items * 100) if total_items else 0,
        filled_rate=round(filled_items / total_items * 100) if total_items else 0,
        gymnastics_days_month=gymnastics_days,
        gymnastics_streak=streak,
        tonnage_month=round(sum(_tonnage(session) for session in sessions), 1),
    )


@router.get("/volume", response_model=list[VolumePoint])
async def volume(
    db: DbSession, user: CurrentUser, weeks: int = Query(default=8, ge=1, le=52)
) -> list[VolumePoint]:
    current_week = _week_start(date.today())
    first_week = current_week - timedelta(weeks=weeks - 1)
    sessions = await _finished_sessions(
        db, user.id, datetime.combine(first_week, time.min, tzinfo=timezone.utc)
    )

    buckets: dict[date, dict[str, float]] = {
        first_week + timedelta(weeks=index): {"tonnage": 0.0, "sets": 0}
        for index in range(weeks)
    }
    for session in sessions:
        if session.finished_at is None:
            continue
        bucket = buckets.get(_week_start(session.finished_at.date()))
        if bucket is None:
            continue
        bucket["tonnage"] += _tonnage(session)
        bucket["sets"] += sum(len(item.get("sets", [])) for item in session.items)

    return [
        VolumePoint(week_start=week, tonnage=round(data["tonnage"], 1), sets=int(data["sets"]))
        for week, data in buckets.items()
    ]


@router.get("/frequency", response_model=list[FrequencyPoint])
async def frequency(
    db: DbSession, user: CurrentUser, weeks: int = Query(default=12, ge=1, le=52)
) -> list[FrequencyPoint]:
    current_week = _week_start(date.today())
    first_week = current_week - timedelta(weeks=weeks - 1)
    sessions = await _finished_sessions(
        db, user.id, datetime.combine(first_week, time.min, tzinfo=timezone.utc)
    )

    buckets: dict[date, int] = {
        first_week + timedelta(weeks=index): 0 for index in range(weeks)
    }
    for session in sessions:
        if session.finished_at is None:
            continue
        week = _week_start(session.finished_at.date())
        if week in buckets:
            buckets[week] += 1

    return [FrequencyPoint(week_start=week, sessions=count) for week, count in buckets.items()]


@router.get("/muscle-balance", response_model=list[MuscleBalanceItem])
async def muscle_balance(
    db: DbSession, user: CurrentUser, days: int = Query(default=30, ge=1, le=365)
) -> list[MuscleBalanceItem]:
    since = datetime.combine(
        date.today() - timedelta(days=days), time.min, tzinfo=timezone.utc
    )
    sessions = await _finished_sessions(db, user.id, since)

    exercise_ids = {
        item["exercise_id"]
        for session in sessions
        for item in session.items
        if item.get("sets")
    }
    if not exercise_ids:
        return []

    rows = await db.execute(
        select(Exercise.id, Exercise.category_id).where(Exercise.id.in_(exercise_ids))
    )
    category_by_exercise = {row[0]: row[1] for row in rows}

    counts: dict[int, int] = {}
    for session in sessions:
        for item in session.items:
            sets = len(item.get("sets", []))
            if not sets:
                continue
            category_id = category_by_exercise.get(item["exercise_id"])
            if category_id is None:
                continue
            counts[category_id] = counts.get(category_id, 0) + sets

    if not counts:
        return []

    categories = {
        category.id: category
        for category in await db.scalars(select(Category).where(Category.id.in_(counts)))
    }
    items = [
        MuscleBalanceItem(
            category_id=category_id, name=categories[category_id].name, sets_count=value
        )
        for category_id, value in counts.items()
        if category_id in categories
    ]
    return sorted(items, key=lambda item: -item.sets_count)


@router.get("/records", response_model=list[ExerciseRecord])
async def records(db: DbSession, user: CurrentUser) -> list[ExerciseRecord]:
    sessions = await _finished_sessions(
        db, user.id, datetime.min.replace(tzinfo=timezone.utc)
    )

    best: dict[int, tuple[float, date]] = {}
    for session in sessions:
        if session.finished_at is None:
            continue
        for item in session.items:
            for entry in item.get("sets", []):
                weight = entry.get("weight") or 0
                if weight <= 0:
                    continue
                exercise_id = item["exercise_id"]
                previous = best.get(exercise_id)
                if previous is None or weight > previous[0]:
                    best[exercise_id] = (weight, session.finished_at.date())

    if not best:
        return []

    names = {
        exercise.id: exercise.name
        for exercise in await db.scalars(select(Exercise).where(Exercise.id.in_(best)))
    }
    return sorted(
        [
            ExerciseRecord(
                exercise_id=exercise_id,
                name=names.get(exercise_id, "Упражнение удалено"),
                best_weight=weight,
                achieved_on=achieved,
            )
            for exercise_id, (weight, achieved) in best.items()
        ],
        key=lambda record: record.name,
    )


@router.get("/exercises", response_model=list[AnalyticsExercise])
async def exercises_with_data(db: DbSession, user: CurrentUser) -> list[AnalyticsExercise]:
    rows = await db.execute(
        text(
            """
            select (item.value->>'exercise_id')::int as exercise_id,
                   max(item.value->>'name') as name,
                   count(distinct ws.id) as sessions_count
            from workout_sessions ws
            cross join lateral jsonb_array_elements(ws.items) as item
            cross join lateral jsonb_array_elements(item.value->'sets') as entry
            where ws.user_id = :user_id and ws.finished_at is not null
            group by 1
            order by 2
            """
        ),
        {"user_id": user.id},
    )
    return [
        AnalyticsExercise(
            exercise_id=row.exercise_id, name=row.name, sessions_count=row.sessions_count
        )
        for row in rows
    ]


@router.get("/exercises/{exercise_id}/weights", response_model=list[ExerciseWeightPoint])
async def exercise_weights(
    exercise_id: int,
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(default=10, ge=1, le=50),
) -> list[ExerciseWeightPoint]:
    rows = await db.execute(
        text(
            """
            select ws.finished_at::date as day,
                   max((entry.value->>'weight')::float) as max_weight,
                   avg((entry.value->>'weight')::float) as avg_weight
            from workout_sessions ws
            cross join lateral jsonb_array_elements(ws.items) as item
            cross join lateral jsonb_array_elements(item.value->'sets') as entry
            where ws.user_id = :user_id
              and ws.finished_at is not null
              and (item.value->>'exercise_id')::int = :exercise_id
              and entry.value ? 'weight'
            group by day
            order by day desc
            limit :limit
            """
        ),
        {"user_id": user.id, "exercise_id": exercise_id, "limit": limit},
    )

    points = [
        ExerciseWeightPoint(
            date=row.day, max_weight=row.max_weight, avg_weight=round(row.avg_weight, 1)
        )
        for row in rows
    ]
    return list(reversed(points))
