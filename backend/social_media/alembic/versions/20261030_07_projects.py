"""Add the project showcase."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_07"
down_revision = "20261030_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("users"):
        return

    if not inspector.has_table("projects"):
        op.create_table(
            "projects",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "owner_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("title", sa.String(length=120), nullable=False),
            sa.Column("tagline", sa.String(length=160), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("category", sa.String(length=20), nullable=False, server_default=""),
            sa.Column("tech_stack", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("repo_url", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("live_url", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="in_progress"),
            sa.Column(
                "looking_for_collaborators",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
        op.create_index("ix_projects_created_at", "projects", ["created_at"])

    if not inspector.has_table("project_images"):
        op.create_table(
            "project_images",
            sa.Column(
                "project_id",
                sa.Integer(),
                sa.ForeignKey("projects.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column("content_type", sa.String(length=50), nullable=False),
            sa.Column("data", sa.LargeBinary(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("project_images"):
        op.drop_table("project_images")
    if inspector.has_table("projects"):
        op.drop_table("projects")
