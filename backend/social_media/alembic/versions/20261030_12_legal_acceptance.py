"""Record acceptance of the Terms of Service and Privacy Policy at signup."""

from alembic import op
import sqlalchemy as sa


revision = "20261030_12"
down_revision = "20261030_11"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table):
        return set()
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    columns = _columns("users")
    if "terms_accepted_at" not in columns:
        op.add_column("users", sa.Column("terms_accepted_at", sa.DateTime(), nullable=True))
    if "terms_version" not in columns:
        op.add_column(
            "users",
            sa.Column("terms_version", sa.String(length=20), nullable=False, server_default=""),
        )
    if "privacy_version" not in columns:
        op.add_column(
            "users",
            sa.Column("privacy_version", sa.String(length=20), nullable=False, server_default=""),
        )


def downgrade() -> None:
    columns = _columns("users")
    if "privacy_version" in columns:
        op.drop_column("users", "privacy_version")
    if "terms_version" in columns:
        op.drop_column("users", "terms_version")
    if "terms_accepted_at" in columns:
        op.drop_column("users", "terms_accepted_at")
