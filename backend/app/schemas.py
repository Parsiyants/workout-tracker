from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
MetricType = Literal["weight_reps", "reps", "time"]
MediaType = Literal["image", "gif", "video"]


class UserCreate(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_admin: bool
    is_demo: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=60)
    parent_id: int | None = None
    muscle_keys: list[str] = Field(default_factory=list)
    image_url: str | None = Field(default=None, max_length=500)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=60)
    parent_id: int | None = None
    muscle_keys: list[str] | None = None
    image_url: str | None = Field(default=None, max_length=500)
    order_index: int | None = Field(default=None, ge=0)


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str | None
    parent_id: int | None
    muscle_keys: list[str]
    image_url: str | None
    order_index: int


class MediaItem(BaseModel):
    type: MediaType
    url: str = Field(max_length=500)


class ExerciseBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    category_id: int
    metric_type: MetricType = "weight_reps"
    media: list[MediaItem] = Field(default_factory=list)


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    category_id: int | None = None
    metric_type: MetricType | None = None
    media: list[MediaItem] | None = None


class ExerciseRead(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TemplateItem(BaseModel):
    exercise_id: int
    target_sets: int = Field(ge=1, le=20)
    target_reps: int | None = Field(default=None, ge=1, le=100)
    target_duration_sec: int | None = Field(default=None, ge=1, le=3600)
    target_weight: float | None = Field(default=None, ge=0, le=1000)


class TemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    exercises: list[TemplateItem] = Field(default_factory=list)


class TemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    exercises: list[TemplateItem] | None = None


class TemplateOrder(BaseModel):
    ids: list[int]


class TemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order_index: int
    exercises: list[TemplateItem]


class SessionSet(BaseModel):
    weight: float | None = Field(default=None, ge=0, le=1000)
    reps: int | None = Field(default=None, ge=1, le=100)
    duration_sec: int | None = Field(default=None, ge=1, le=7200)


class SessionItem(BaseModel):
    exercise_id: int
    name: str
    metric_type: MetricType = "weight_reps"
    completed: bool = False
    notes: str | None = None
    sets: list[SessionSet] = Field(default_factory=list)
    target_sets: int | None = None
    target_reps: int | None = None
    target_duration_sec: int | None = None
    target_weight: float | None = None


class SessionCreate(BaseModel):
    template_id: int | None = None


class SessionItemUpdate(BaseModel):
    completed: bool | None = None
    notes: str | None = None
    sets: list[SessionSet] | None = None


class SessionAddItem(BaseModel):
    exercise_id: int


class SessionListItem(BaseModel):
    id: int
    template_name: str
    finished_at: datetime
    total_items: int
    completed_items: int
    duration_min: int
    tonnage: float
    category_ids: list[int]


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int | None
    template_name: str
    items: list[SessionItem]
    started_at: datetime
    finished_at: datetime | None


class GymnasticsLogUpdate(BaseModel):
    completed: bool = False
    notes: str | None = None


class GymnasticsProgramCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    exercises: list[TemplateItem] = Field(default_factory=list)


class GymnasticsProgramUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    exercises: list[TemplateItem] | None = None


class GymnasticsProgramRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order_index: int
    exercises: list[TemplateItem]


class GymnasticsLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_date: date
    completed: bool
    notes: str | None


class AnalyticsSummary(BaseModel):
    workouts_week: int
    workouts_month: int
    avg_duration_min: int
    completion_rate: int
    filled_rate: int
    gymnastics_days_month: int
    gymnastics_streak: int
    tonnage_month: float


class VolumePoint(BaseModel):
    week_start: date
    tonnage: float
    sets: int


class FrequencyPoint(BaseModel):
    week_start: date
    sessions: int


class MuscleBalanceItem(BaseModel):
    category_id: int
    name: str
    sets_count: int


class ExerciseRecord(BaseModel):
    exercise_id: int
    name: str
    best_weight: float
    achieved_on: date


class PruneResult(BaseModel):
    removed: list[str]


class AnalyticsExercise(BaseModel):
    exercise_id: int
    name: str
    sessions_count: int


class ExerciseWeightPoint(BaseModel):
    date: date
    max_weight: float
    avg_weight: float
