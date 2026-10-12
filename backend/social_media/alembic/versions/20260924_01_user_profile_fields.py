"""Add display name and bio to users."""

from alembic import op
import sqlalchemy as sa
from app.models import Base

revision = "20260924_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if not sa.inspect(bind).has_table("users"):
        Base.metadata.create_all(bind=bind)
    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "display_name" not in columns:
        op.add_column("users", sa.Column("display_name", sa.String(length=80), nullable=False, server_default=""))
    if "bio" not in columns:
        op.add_column("users", sa.Column("bio", sa.String(length=160), nullable=False, server_default=""))
    op.execute("UPDATE users SET display_name = username WHERE display_name = ''")


def downgrade() -> None:
    op.drop_column("users", "bio")
    op.drop_column("users", "display_name")
