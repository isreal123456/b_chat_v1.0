"""Authentication tests."""

import asyncio

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.database import Base
from app.database.database import get_db
from app.main import app
from app.models.user import User


engine = create_async_engine(
    "sqlite+aiosqlite://",
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)


async def create_test_user() -> User:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        user = User(
            username="alice",
            email="alice@example.com",
            password=hash_password("secret123"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


def override_get_db():
    async def _override():
        async with AsyncSession(engine) as session:
            yield session

    return _override


app.dependency_overrides[get_db] = override_get_db()
client = TestClient(app)


def test_get_user_by_username_requires_auth():
    asyncio.run(create_test_user())

    response = client.get("/users/alice")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired access token"
