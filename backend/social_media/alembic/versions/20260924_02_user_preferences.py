"""Persist account notification and privacy preferences."""

from alembic import op
import sqlalchemy as sa

revision = "20260924_02"
down_revision = "20260924_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("user_preferences"):
        return
    op.create_table(
        "user_preferences",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("likes", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("comments", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("follows", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("messages", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("private_account", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("show_activity", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("allow_tagging", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_preferences")
