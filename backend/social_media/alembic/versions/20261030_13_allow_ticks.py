"""Add a preference for receiving ticks on posts."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_13"
down_revision = "20261030_12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("user_preferences"):
        return

    columns = {column["name"] for column in inspector.get_columns("user_preferences")}
    if "allow_ticks" not in columns:
        op.add_column(
            "user_preferences",
            sa.Column("allow_ticks", sa.Boolean(), nullable=False, server_default=sa.true()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("user_preferences"):
        columns = {column["name"] for column in inspector.get_columns("user_preferences")}
        if "allow_ticks" in columns:
            op.drop_column("user_preferences", "allow_ticks")
