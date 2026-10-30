"""Link feed posts to projects and prepare Feed 2.0."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_09"
down_revision = "20261030_08"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("posts"):
        return

    columns = {column["name"] for column in inspector.get_columns("posts")}
    if "project_id" in columns:
        return

    if inspector.has_table("projects"):
        with op.batch_alter_table("posts") as batch:
            batch.add_column(sa.Column("project_id", sa.Integer(), nullable=True))
            batch.create_foreign_key(
                "fk_posts_project_id",
                "projects",
                ["project_id"],
                ["id"],
                ondelete="SET NULL",
            )
        op.create_index("ix_posts_project_id", "posts", ["project_id"])
    else:
        with op.batch_alter_table("posts") as batch:
            batch.add_column(sa.Column("project_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("posts"):
        return
    columns = {column["name"] for column in inspector.get_columns("posts")}
    if "project_id" not in columns:
        return
    with op.batch_alter_table("posts") as batch:
        batch.drop_column("project_id")
