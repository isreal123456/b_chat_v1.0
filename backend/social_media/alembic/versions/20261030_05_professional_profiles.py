"""Add email verification and professional profile fields."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_05"
down_revision = "20261030_04"
branch_labels = None
depends_on = None


COLUMNS = {
    "email_verified": sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    "headline": sa.Column("headline", sa.String(length=120), nullable=False, server_default=""),
    "category": sa.Column("category", sa.String(length=20), nullable=False, server_default=""),
    "skills": sa.Column("skills", sa.Text(), nullable=False, server_default=sa.text("'[]'")),
    "github_url": sa.Column("github_url", sa.String(length=255), nullable=False, server_default=""),
    "portfolio_url": sa.Column("portfolio_url", sa.String(length=255), nullable=False, server_default=""),
    "linkedin_url": sa.Column("linkedin_url", sa.String(length=255), nullable=False, server_default=""),
    "location": sa.Column("location", sa.String(length=100), nullable=False, server_default=""),
    "available_for_work": sa.Column("available_for_work", sa.Boolean(), nullable=False, server_default=sa.false()),
    "onboarded": sa.Column("onboarded", sa.Boolean(), nullable=False, server_default=sa.true()),
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("users"):
        return

    existing = {column["name"] for column in inspector.get_columns("users")}
    for name, column in COLUMNS.items():
        if name not in existing:
            op.add_column("users", column)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("users"):
        return

    existing = {column["name"] for column in inspector.get_columns("users")}
    with op.batch_alter_table("users") as batch_op:
        for name in COLUMNS:
            if name in existing:
                batch_op.drop_column(name)
