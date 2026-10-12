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


async def ensure_test_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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


def test_register_login_profile_and_preferences_round_trip():
    asyncio.run(ensure_test_tables())
    registration = client.post("/auth/register", json={
        "username": "profilewriter",
        "name": "Profile Writer",
        "email": "profilewriter@example.com",
        "password": "secure-password-123",
    })
    assert registration.status_code == 201, registration.text

    login = client.post("/auth/login", data={
        "username": "profilewriter@example.com",
        "password": "secure-password-123",
    })
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    profile = client.patch("/users/me", headers=headers, json={
        "username": "profilewriter",
        "name": "Writer Updated",
        "bio": "Building thoughtful things.",
    })
    assert profile.status_code == 200, profile.text
    assert profile.json()["name"] == "Writer Updated"
    assert profile.json()["bio"] == "Building thoughtful things."

    saved = client.put("/users/me/preferences", headers=headers, json={
        "likes": False,
        "comments": True,
        "follows": False,
        "messages": True,
        "email_notifications": True,
        "private_account": True,
        "show_activity": False,
        "allow_tagging": True,
    })
    assert saved.status_code == 200, saved.text
    assert saved.json()["private_account"] is True
    assert client.get("/users/me/preferences", headers=headers).json()["email_notifications"] is True

    search_account = client.post("/auth/register", json={
        "username": "searchalice",
        "name": "Search Alice",
        "email": "searchalice@example.com",
        "password": "secure-password-123",
    })
    assert search_account.status_code == 201, search_account.text
    results = client.get("/users/search?query=Search", headers=headers)
    assert results.status_code == 200
    assert results.json()[0]["name"] == "Search Alice"
    assert "email" not in results.json()[0]


def test_friend_post_like_comment_and_feed_api_flow():
    asyncio.run(ensure_test_tables())
    def register_and_login(username, name):
        response = client.post("/auth/register", json={
            "username": username,
            "name": name,
            "email": f"{username}@example.com",
            "password": "secure-password-123",
        })
        assert response.status_code == 201, response.text
        login = client.post("/auth/login", data={
            "username": f"{username}@example.com",
            "password": "secure-password-123",
        })
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    author_headers = register_and_login("actionauthor", "Action Author")
    viewer_headers = register_and_login("actionviewer", "Action Viewer")
    stranger_headers = register_and_login("actionstranger", "Action Stranger")

    author = client.get("/users/me", headers=author_headers).json()
    viewer = client.get("/users/me", headers=viewer_headers).json()
    sent = client.post(f"/friends/requests/{viewer['id']}", headers=author_headers)
    assert sent.status_code == 201, sent.text
    request_id = sent.json()["request_id"]
    accepted = client.patch(f"/friends/requests/{request_id}/accept", headers=viewer_headers)
    assert accepted.status_code == 200, accepted.text
    assert any(friend["id"] == viewer["id"] for friend in client.get("/friends", headers=author_headers).json())
    assert any(item["id"] == viewer["id"] for item in client.get("/conversations", headers=author_headers).json())

    author_token = author_headers["Authorization"].split(" ", 1)[1]
    with client.websocket_connect(f"/messages/ws/{author['id']}?token={author_token}") as socket:
        socket.send_json({"receiver_id": client.get("/users/me", headers=stranger_headers).json()["id"], "content": "Not allowed"})
        assert "friends" in socket.receive_json()["error"]
        socket.send_json({"receiver_id": viewer["id"], "content": "Hello from the UI"})
        assert socket.receive_json()["content"] == "Hello from the UI"
    history = client.get(f"/messages/{viewer['id']}/history", headers=author_headers)
    assert history.status_code == 200
    assert history.json()[0]["content"] == "Hello from the UI"
    viewer_notifications = client.get("/notifications", headers=viewer_headers)
    assert viewer_notifications.status_code == 200
    assert {item["type"] for item in viewer_notifications.json()} >= {"friend_request", "message"}
    unread = next(item for item in viewer_notifications.json() if item["type"] == "message")
    read_response = client.patch(f"/notifications/{unread['id']}/read", headers=viewer_headers)
    assert read_response.status_code == 200
    assert read_response.json()["is_read"] is True

    author_preferences = client.get("/users/me/preferences", headers=author_headers).json()
    author_preferences["private_account"] = True
    privacy = client.put("/users/me/preferences", headers=author_headers, json=author_preferences)
    assert privacy.status_code == 200, privacy.text

    created = client.post("/posts", headers=author_headers, json={"content": "End-to-end API post"})
    assert created.status_code == 201, created.text
    post_id = created.json()["id"]
    assert any(post["id"] == post_id for post in client.get("/posts/all_posts", headers=author_headers).json())
    liked = client.post(f"/likes/{post_id}", headers=viewer_headers)
    assert liked.status_code == 201, liked.text
    comment = client.post("/comments/", headers=viewer_headers, json={"post_id": post_id, "content": "Connected end to end"})
    assert comment.status_code == 201, comment.text
    comments = client.get(f"/comments/posts/{post_id}/comments", headers=author_headers)
    assert comments.status_code == 200
    assert comments.json()[0]["author"] == "Action Viewer"
    single_comment = client.get(f"/comments/{comment.json()['id']}", headers=author_headers)
    assert single_comment.status_code == 200, single_comment.text

    stranger_feed = client.get("/posts/all_posts", headers=stranger_headers)
    assert stranger_feed.status_code == 200
    assert all(post["id"] != post_id for post in stranger_feed.json())
    assert client.get(f"/comments/posts/{post_id}/comments", headers=stranger_headers).status_code == 404
    assert client.post(f"/likes/{post_id}", headers=stranger_headers).status_code == 404
    author_notifications = client.get("/notifications", headers=author_headers).json()
    assert {item["type"] for item in author_notifications} >= {"friend_accepted", "like", "comment"}
    viewer_feed = client.get("/posts/all_posts", headers=viewer_headers)
    assert any(post["id"] == post_id for post in viewer_feed.json())
