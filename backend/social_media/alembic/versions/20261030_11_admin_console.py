"""Add administrative roles, moderation state, reports, settings, and audit logs."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_11"
down_revision = "20261030_10"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _columns(table: str) -> set[str]:
    inspector = _inspector()
    if not inspector.has_table(table):
        return set()
    return {column["name"] for column in inspector.get_columns(table)}


def _indexes(table: str) -> set[str]:
    inspector = _inspector()
    if not inspector.has_table(table):
        return set()
    return {index["name"] for index in inspector.get_indexes(table)}


def _add_column(table: str, column: sa.Column) -> None:
    if column.name in _columns(table):
        return
    # SQLite cannot ALTER in a foreign key; the column stays a plain integer,
    # which matches how the rest of this SQLite schema treats references.
    if column.foreign_keys and op.get_bind().dialect.name == "sqlite":
        column = sa.Column(
            column.name,
            column.type,
            nullable=column.nullable,
            server_default=column.server_default,
        )
    op.add_column(table, column)


def _create_index(name: str, table: str, columns: list[str], *, unique: bool = False) -> None:
    if name not in _indexes(table):
        op.create_index(name, table, columns, unique=unique)


def _add_created_at(table: str) -> None:
    if "created_at" in _columns(table):
        return
    if op.get_bind().dialect.name == "sqlite":
        # SQLite refuses a non-constant default on ALTER TABLE, so legacy rows
        # are stamped at migration time instead.
        op.add_column(table, sa.Column("created_at", sa.DateTime(), nullable=True))
        op.execute(
            f"UPDATE {table} SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
        )
    else:
        op.add_column(
            table,
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )


def upgrade() -> None:
    _add_column("users", sa.Column("role", sa.String(20), nullable=False, server_default="user"))
    _add_column(
        "users",
        sa.Column("account_status", sa.String(20), nullable=False, server_default="active"),
    )
    _add_column("users", sa.Column("suspended_at", sa.DateTime(), nullable=True))
    _add_column(
        "users",
        sa.Column("suspension_reason", sa.String(255), nullable=False, server_default=""),
    )
    _add_column("users", sa.Column("last_active_at", sa.DateTime(), nullable=True))

    _add_column(
        "posts",
        sa.Column("moderation_status", sa.String(20), nullable=False, server_default="published"),
    )
    _add_column(
        "posts",
        sa.Column("removed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    _add_column("posts", sa.Column("removed_at", sa.DateTime(), nullable=True))
    _add_column(
        "posts", sa.Column("removal_reason", sa.String(500), nullable=False, server_default="")
    )

    _add_created_at("comments")
    _add_column(
        "comments",
        sa.Column("moderation_status", sa.String(20), nullable=False, server_default="published"),
    )
    _add_column(
        "comments",
        sa.Column("removed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    _add_column("comments", sa.Column("removed_at", sa.DateTime(), nullable=True))
    _add_column(
        "comments", sa.Column("removal_reason", sa.String(500), nullable=False, server_default="")
    )

    _add_created_at("ticks")

    _add_column(
        "projects",
        sa.Column("moderation_status", sa.String(20), nullable=False, server_default="published"),
    )
    _add_column(
        "projects", sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    _add_column("projects", sa.Column("featured_at", sa.DateTime(), nullable=True))
    _add_column(
        "projects",
        sa.Column("removed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    _add_column("projects", sa.Column("removed_at", sa.DateTime(), nullable=True))
    _add_column(
        "projects", sa.Column("removal_reason", sa.String(500), nullable=False, server_default="")
    )

    _create_index("ix_users_role", "users", ["role"])
    _create_index("ix_users_account_status", "users", ["account_status"])
    _create_index("ix_users_created_at", "users", ["created_at"])
    _create_index("ix_posts_moderation_status", "posts", ["moderation_status"])
    _create_index("ix_posts_created_at", "posts", ["created_at"])
    _create_index("ix_comments_moderation_status", "comments", ["moderation_status"])
    _create_index("ix_comments_created_at", "comments", ["created_at"])
    _create_index("ix_ticks_created_at", "ticks", ["created_at"])
    _create_index("ix_projects_moderation_status", "projects", ["moderation_status"])
    _create_index("ix_projects_featured", "projects", ["featured"])

    inspector = _inspector()
    if not inspector.has_table("reports"):
        op.create_table(
            "reports",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "reporter_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("target_type", sa.String(20), nullable=False),
            sa.Column("target_id", sa.Integer(), nullable=False),
            sa.Column(
                "target_author_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("reason", sa.String(40), nullable=False),
            sa.Column("details", sa.Text(), nullable=False, server_default=""),
            sa.Column("content_snapshot", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column(
                "reviewed_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
            sa.Column("resolution_note", sa.Text(), nullable=False, server_default=""),
            sa.Column("resolution_action", sa.String(40), nullable=False, server_default="none"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )
        _create_index("ix_reports_reporter_id", "reports", ["reporter_id"])
        _create_index("ix_reports_status", "reports", ["status"])
        _create_index("ix_reports_created_at", "reports", ["created_at"])
        _create_index("ix_reports_status_created", "reports", ["status", "created_at"])
        _create_index("ix_reports_target", "reports", ["target_type", "target_id"])
        _create_index(
            "ix_reports_target_author", "reports", ["target_author_id", "status"]
        )

    if not inspector.has_table("admin_activity_logs"):
        op.create_table(
            "admin_activity_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "admin_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("admin_email", sa.String(255), nullable=False, server_default=""),
            sa.Column("admin_username", sa.String(50), nullable=False, server_default=""),
            sa.Column("admin_role", sa.String(20), nullable=False, server_default=""),
            sa.Column("action", sa.String(60), nullable=False),
            sa.Column("target_type", sa.String(30), nullable=False, server_default=""),
            sa.Column("target_id", sa.Integer(), nullable=True),
            sa.Column("summary", sa.String(255), nullable=False, server_default=""),
            sa.Column("details", sa.Text(), nullable=False, server_default="{}"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )
        _create_index(
            "ix_admin_activity_logs_admin_id", "admin_activity_logs", ["admin_id"]
        )
        _create_index(
            "ix_admin_activity_logs_action", "admin_activity_logs", ["action"]
        )
        _create_index(
            "ix_admin_activity_logs_created_at", "admin_activity_logs", ["created_at"]
        )
        _create_index(
            "ix_admin_activity_action_created",
            "admin_activity_logs",
            ["action", "created_at"],
        )

    if not inspector.has_table("admin_settings"):
        op.create_table(
            "admin_settings",
            sa.Column("key", sa.String(60), primary_key=True),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column(
                "updated_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )


def downgrade() -> None:
    inspector = _inspector()
    if inspector.has_table("admin_settings"):
        op.drop_table("admin_settings")
    if inspector.has_table("admin_activity_logs"):
        op.drop_table("admin_activity_logs")
    if inspector.has_table("reports"):
        op.drop_table("reports")

    for table, columns in {
        "projects": ["removal_reason", "removed_at", "removed_by", "featured_at", "featured", "moderation_status"],
        "ticks": ["created_at"],
        "comments": ["removal_reason", "removed_at", "removed_by", "moderation_status", "created_at"],
        "posts": ["removal_reason", "removed_at", "removed_by", "moderation_status"],
        "users": ["last_active_at", "suspension_reason", "suspended_at", "account_status", "role"],
    }.items():
        existing = _columns(table)
        with op.batch_alter_table(table) as batch:
            for column in columns:
                if column in existing:
                    batch.drop_column(column)
