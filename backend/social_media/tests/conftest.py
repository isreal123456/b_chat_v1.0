"""Shared test fixtures: isolated in-memory database, API client, and user helpers."""

import asyncio
import itertools

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database.database import get_db
from app.main import app


async def _create_tables(engine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture()
def engine():
    test_engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    asyncio.run(_create_tables(test_engine))
    yield test_engine
    asyncio.run(test_engine.dispose())


@pytest.fixture()
def client(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def register(client):
    sequence = itertools.count(1)

    def _register(username: str | None = None, name: str | None = None, email: str | None = None):
        index = next(sequence)
        username = username or f"user{index}"
        email = email or f"{username}@example.com"
        payload = {
            "username": username,
            "name": name or username.title(),
            "email": email,
            "password": "secure-password-123",
            "terms_accepted": True,
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 201, response.text
        login = client.post(
            "/auth/login",
            data={"username": email, "password": payload["password"]},
        )
        assert login.status_code == 200, login.text
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        profile = client.get("/users/me", headers=headers)
        assert profile.status_code == 200, profile.text
        return {
            "headers": headers,
            "token": login.json()["access_token"],
            "user": profile.json(),
            "password": payload["password"],
            "email": email,
        }

    return _register


@pytest.fixture()
def connect_friends(client):
    def _connect(first, second):
        sent = client.post(f"/friends/requests/{second['user']['id']}", headers=first["headers"])
        assert sent.status_code == 201, sent.text
        accepted = client.patch(
            f"/friends/requests/{sent.json()['request_id']}/accept",
            headers=second["headers"],
        )
        assert accepted.status_code == 200, accepted.text
        return sent.json()["request_id"]

    return _connect
