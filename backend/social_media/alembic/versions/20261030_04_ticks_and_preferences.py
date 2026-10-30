"""Rename notification preference to Ticks and ensure Tick storage exists."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_04"
down_revision = "20260925_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("user_preferences"):
        columns = {column["name"] for column in inspector.get_columns("user_preferences")}
        if "likes" in columns and "ticks" not in columns:
            op.alter_column("user_preferences", "likes", new_column_name="ticks")
        elif "ticks" not in columns:
            op.add_column(
                "user_preferences",
                sa.Column("ticks", sa.Boolean(), nullable=False, server_default=sa.true()),
            )

    if not inspector.has_table("ticks"):
        op.create_table(
            "ticks",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("post_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("post_id", "user_id", name="uq_tick_post_user"),
        )
        op.create_index("ix_ticks_id", "ticks", ["id"], unique=False)
        op.create_index("ix_ticks_post_id", "ticks", ["post_id"], unique=False)
        op.create_index("ix_ticks_user_id", "ticks", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("ticks"):
        op.drop_index("ix_ticks_user_id", table_name="ticks")
        op.drop_index("ix_ticks_post_id", table_name="ticks")
        op.drop_index("ix_ticks_id", table_name="ticks")
        op.drop_table("ticks")
    if inspector.has_table("user_preferences"):
        columns = {column["name"] for column in inspector.get_columns("user_preferences")}
        if "ticks" in columns and "likes" not in columns:
            op.alter_column("user_preferences", "ticks", new_column_name="likes")
