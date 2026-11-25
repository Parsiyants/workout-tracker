"""exercise media list + metric type

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-23

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "exercises",
        sa.Column(
            "media",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "exercises",
        sa.Column(
            "metric_type", sa.String(length=20), nullable=False, server_default=sa.text("'weight_reps'")
        ),
    )
    op.create_check_constraint(
        "ck_exercises_metric_type",
        "exercises",
        "metric_type in ('weight_reps', 'reps', 'time')",
    )

    op.execute(
        """
        update exercises e
        set media = sub.items
        from (
            select id,
                   jsonb_agg(jsonb_build_object('type', media_type, 'url', url) order by media_type) as items
            from (
                select id, 'image' as media_type, image_url as url from exercises where image_url is not null
                union all
                select id, 'gif', gif_url from exercises where gif_url is not null
                union all
                select id, 'video', video_url from exercises where video_url is not null
            ) flat
            group by id
        ) sub
        where e.id = sub.id
        """
    )

    op.drop_column("exercises", "image_url")
    op.drop_column("exercises", "gif_url")
    op.drop_column("exercises", "video_url")


def downgrade() -> None:
    op.add_column("exercises", sa.Column("image_url", sa.String(length=500), nullable=True))
    op.add_column("exercises", sa.Column("gif_url", sa.String(length=500), nullable=True))
    op.add_column("exercises", sa.Column("video_url", sa.String(length=500), nullable=True))

    op.execute(
        """
        update exercises set
            image_url = (
                select item->>'url' from jsonb_array_elements(media) item
                where item->>'type' = 'image' limit 1
            ),
            gif_url = (
                select item->>'url' from jsonb_array_elements(media) item
                where item->>'type' = 'gif' limit 1
            ),
            video_url = (
                select item->>'url' from jsonb_array_elements(media) item
                where item->>'type' = 'video' limit 1
            )
        """
    )

    op.drop_constraint("ck_exercises_metric_type", "exercises", type_="check")
    op.drop_column("exercises", "metric_type")
    op.drop_column("exercises", "media")
