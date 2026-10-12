"""Migrate legacy notifications to recipient and sender fields."""

from alembic import op
import sqlalchemy as sa


revision = "20260925_03"
down_revision = "20260924_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("notifications"):
        return

    columns = {column["name"] for column in inspector.get_columns("notifications")}
    required = {
        "id", "recipient_id", "sender_id", "type", "message",
        "post_id", "is_read", "created_at",
    }
    if required.issubset(columns):
        return

    recipient_column = "recipient_id" if "recipient_id" in columns else "user_id"
    if recipient_column not in columns:
        raise RuntimeError(
            "Cannot migrate notifications: expected a recipient_id or legacy user_id column"
        )

    op.rename_table("notifications", "notifications_legacy")
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    legacy = sa.Table("notifications_legacy", sa.MetaData(), autoload_with=bind)
    recipient = legacy.c[recipient_column]
    sender = (
        sa.func.coalesce(legacy.c.sender_id, recipient)
        if "sender_id" in columns
        else recipient
    )
    notification_type = (
        sa.func.coalesce(legacy.c.type, "system")
        if "type" in columns
        else sa.literal("system")
    )
    message = legacy.c.message if "message" in columns else sa.literal("")
    post_id = legacy.c.post_id if "post_id" in columns else sa.null()
    is_read = (
        sa.func.coalesce(legacy.c.is_read, sa.false())
        if "is_read" in columns
        else sa.false()
    )
    created_at = (
        legacy.c.created_at
        if "created_at" in columns
        else sa.func.current_timestamp()
    )

    notifications = sa.Table("notifications", sa.MetaData(), autoload_with=bind)
    bind.execute(
        sa.insert(notifications).from_select(
            [
                "id", "recipient_id", "sender_id", "type", "message",
                "post_id", "is_read", "created_at",
            ],
            sa.select(
                legacy.c.id,
                recipient,
                sender,
                notification_type,
                message,
                post_id,
                is_read,
                created_at,
            ),
        )
    )
    op.drop_table("notifications_legacy")


def downgrade() -> None:
    # Keep the migrated schema intact to avoid discarding notification fields.
    pass
