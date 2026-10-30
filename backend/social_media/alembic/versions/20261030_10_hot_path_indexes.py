"""Add indexes for notifications, messages, connections, and block pairs."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_10"
down_revision = "20261030_09"
branch_labels = None
depends_on = None


def _index_names(inspector, table: str) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("notifications"):
        names = _index_names(inspector, "notifications")
        if "ix_notifications_recipient_id" not in names:
            op.create_index(
                "ix_notifications_recipient_id", "notifications", ["recipient_id"]
            )
        if "ix_notifications_recipient_unread" not in names:
            op.create_index(
                "ix_notifications_recipient_unread",
                "notifications",
                ["recipient_id", "is_read"],
            )

    if inspector.has_table("messages"):
        names = _index_names(inspector, "messages")
        if "ix_messages_receiver_unread" not in names:
            op.create_index(
                "ix_messages_receiver_unread", "messages", ["receiver_id", "is_read"]
            )

    if inspector.has_table("friend_requests"):
        names = _index_names(inspector, "friend_requests")
        if "ix_friend_requests_sender_id" not in names:
            op.create_index(
                "ix_friend_requests_sender_id", "friend_requests", ["sender_id"]
            )
        if "ix_friend_requests_receiver_id" not in names:
            op.create_index(
                "ix_friend_requests_receiver_id", "friend_requests", ["receiver_id"]
            )

    if inspector.has_table("blocks"):
        names = _index_names(inspector, "blocks")
        if "uq_block_pair" not in names:
            bind.execute(
                sa.text(
                    "DELETE FROM blocks WHERE id NOT IN "
                    "(SELECT MIN(id) FROM blocks GROUP BY blocker_id, blocked_id)"
                )
            )
            op.create_index(
                "uq_block_pair", "blocks", ["blocker_id", "blocked_id"], unique=True
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("notifications"):
        names = _index_names(inspector, "notifications")
        if "ix_notifications_recipient_unread" in names:
            op.drop_index("ix_notifications_recipient_unread", table_name="notifications")
        if "ix_notifications_recipient_id" in names:
            op.drop_index("ix_notifications_recipient_id", table_name="notifications")

    if inspector.has_table("messages"):
        if "ix_messages_receiver_unread" in _index_names(inspector, "messages"):
            op.drop_index("ix_messages_receiver_unread", table_name="messages")

    if inspector.has_table("friend_requests"):
        names = _index_names(inspector, "friend_requests")
        if "ix_friend_requests_sender_id" in names:
            op.drop_index("ix_friend_requests_sender_id", table_name="friend_requests")
        if "ix_friend_requests_receiver_id" in names:
            op.drop_index("ix_friend_requests_receiver_id", table_name="friend_requests")

    if inspector.has_table("blocks"):
        if "uq_block_pair" in _index_names(inspector, "blocks"):
            op.drop_index("uq_block_pair", table_name="blocks")
