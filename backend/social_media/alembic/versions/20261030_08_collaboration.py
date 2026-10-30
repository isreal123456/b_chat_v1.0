"""Add Build Together collaboration requests."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_08"
down_revision = "20261030_07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("projects"):
        return

    if not inspector.has_table("collaboration_requests"):
        op.create_table(
            "collaboration_requests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "project_id",
                sa.Integer(),
                sa.ForeignKey("projects.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "requester_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("message", sa.String(length=300), nullable=False, server_default=""),
            sa.Column("role", sa.String(length=60), nullable=False, server_default=""),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("project_id", "requester_id", name="uq_collaboration_pair"),
        )
        op.create_index(
            "ix_collaboration_requests_project_id",
            "collaboration_requests",
            ["project_id"],
        )
        op.create_index(
            "ix_collaboration_requests_requester_id",
            "collaboration_requests",
            ["requester_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("collaboration_requests"):
        op.drop_table("collaboration_requests")
