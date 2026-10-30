"""Authentication, profile, and preference tests."""

from urllib.parse import parse_qs, urlparse

from app.core.legal import LEGAL_VERSION


def _token_from_url(url: str) -> str:
    return parse_qs(urlparse(url).query)["token"][0]


def test_registration_login_profile_and_preferences(client, register):
    session = register(username="alice", name="Alice Dev")
    headers = session["headers"]
    assert session["user"]["username"] == "alice"
    assert session["user"]["name"] == "Alice Dev"

    updated = client.patch(
        "/users/me",
        headers=headers,
        json={
            "username": "alice",
            "name": "Alice Developer",
            "bio": "Building thoughtful things.",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Alice Developer"
    assert updated.json()["bio"] == "Building thoughtful things."

    preferences = client.get("/users/me/preferences", headers=headers)
    assert preferences.status_code == 200
    assert preferences.json()["ticks"] is True

    saved = client.put(
        "/users/me/preferences",
        headers=headers,
        json={**preferences.json(), "private_account": True, "email_notifications": True},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["private_account"] is True
    assert client.get("/users/me/preferences", headers=headers).json()["email_notifications"] is True


def test_duplicate_and_invalid_registration(client):
    payload = {
        "username": "duplicate",
        "name": "Duplicate User",
        "email": "duplicate@example.com",
        "password": "secure-password-123",
        "terms_accepted": True,
    }
    assert client.post("/auth/register", json=payload).status_code == 201

    assert client.post("/auth/register", json=payload).status_code == 400
    same_email = {**payload, "username": "other"}
    assert client.post("/auth/register", json=same_email).status_code == 400

    invalid = {**payload, "username": "no spaces allowed"}
    assert client.post("/auth/register", json=invalid).status_code == 422
    short_password = {**payload, "email": "short@example.com", "password": "short"}
    assert client.post("/auth/register", json=short_password).status_code == 422


def test_registration_requires_terms_acceptance(client):
    payload = {
        "username": "legalsignup",
        "name": "Legal Signup",
        "email": "legalsignup@example.com",
        "password": "secure-password-123",
    }
    assert client.post("/auth/register", json=payload).status_code == 422
    assert (
        client.post("/auth/register", json={**payload, "terms_accepted": False}).status_code
        == 422
    )

    created = client.post("/auth/register", json={**payload, "terms_accepted": True})
    assert created.status_code == 201, created.text

    login = client.post(
        "/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    me = client.get("/users/me", headers=headers).json()
    assert me["terms_version"] == LEGAL_VERSION
    assert me["privacy_version"] == LEGAL_VERSION
    assert me["terms_accepted_at"]

    public = client.get(f"/users/{payload['username']}", headers=headers).json()
    assert "terms_accepted_at" not in public
    assert "terms_version" not in public


def test_login_requires_correct_password(client, register):
    session = register(username="logincheck")
    failed = client.post(
        "/auth/login",
        data={"username": session["email"], "password": "wrong-password"},
    )
    assert failed.status_code == 401
    assert client.get("/users/me", headers=session["headers"]).status_code == 200


def test_protected_endpoints_require_token(client):
    assert client.get("/users/me").status_code == 401
    assert client.get("/users/alice").status_code == 401
    response = client.get("/users/me", headers={"Authorization": "Bearer not-a-token"})
    assert response.status_code == 401


def test_search_users_excludes_email_and_self(client, register):
    alice = register(username="searchalice", name="Search Alice")
    register(username="searchbob", name="Search Bob")

    results = client.get("/users/search?query=Search", headers=alice["headers"])
    assert results.status_code == 200
    names = {item["name"] for item in results.json()}
    assert {"Search Bob"}.issubset(names)
    assert "Search Alice" not in names
    assert all("email" not in item for item in results.json())


def test_password_update_flow(client, register):
    session = register(username="passworduser")
    headers = session["headers"]

    wrong = client.patch(
        "/users/me/password",
        headers=headers,
        json={"current_password": "nope", "new_password": "new-password-123"},
    )
    assert wrong.status_code == 400

    changed = client.patch(
        "/users/me/password",
        headers=headers,
        json={"current_password": session["password"], "new_password": "new-password-123"},
    )
    assert changed.status_code == 204
    login = client.post(
        "/auth/login",
        data={"username": session["email"], "password": "new-password-123"},
    )
    assert login.status_code == 200


def test_email_verification_flow(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "verifyuser",
            "name": "Verify User",
            "email": "verify@example.com",
            "password": "secure-password-123",
            "terms_accepted": True,
        },
    )
    assert response.status_code == 201, response.text
    token = _token_from_url(response.json()["verification_url"])

    verified = client.post("/auth/verify-email", json={"token": token})
    assert verified.status_code == 200, verified.text
    assert verified.json()["email_verified"] is True

    login = client.post(
        "/auth/login",
        data={"username": "verify@example.com", "password": "secure-password-123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/users/me", headers=headers).json()["email_verified"] is True

    # Verifying twice is harmless.
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200
    assert client.post("/auth/verify-email", json={"token": "not-a-real-token"}).status_code == 400


def test_resend_verification_returns_fresh_link(client, register):
    session = register(username="resenduser")
    assert session["user"]["email_verified"] is False

    unauthenticated = client.post("/auth/resend-verification")
    assert unauthenticated.status_code == 401

    resent = client.post("/auth/resend-verification", headers=session["headers"])
    assert resent.status_code == 200, resent.text
    token = _token_from_url(resent.json()["verification_url"])
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200

    already = client.post("/auth/resend-verification", headers=session["headers"])
    assert already.json()["email_verified"] is True


def test_password_reset_flow(client, register):
    session = register(username="resetuser")

    unknown = client.post("/auth/forgot-password", json={"email": "missing@example.com"})
    assert unknown.status_code == 200
    assert "reset_url" not in unknown.json()

    requested = client.post("/auth/forgot-password", json={"email": session["email"]})
    assert requested.status_code == 200, requested.text
    token = _token_from_url(requested.json()["reset_url"])

    reset = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "brand-new-password-123"},
    )
    assert reset.status_code == 200, reset.text

    assert client.post(
        "/auth/login",
        data={"username": session["email"], "password": session["password"]},
    ).status_code == 401
    assert client.post(
        "/auth/login",
        data={"username": session["email"], "password": "brand-new-password-123"},
    ).status_code == 200

    # The link is single-use because the password fingerprint no longer matches.
    reused = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "another-password-123"},
    )
    assert reused.status_code == 400


def test_professional_profile_fields(client, register):
    session = register(username="profilefields")
    headers = session["headers"]

    updated = client.patch(
        "/users/me",
        headers=headers,
        json={
            "headline": "Frontend engineer",
            "category": "developer",
            "skills": ["React", "react", " FastAPI ", ""],
            "github_url": "https://github.com/profilefields",
            "portfolio_url": "",
            "location": "Berlin",
            "available_for_work": True,
            "onboarded": True,
        },
    )
    assert updated.status_code == 200, updated.text
    profile = updated.json()
    assert profile["headline"] == "Frontend engineer"
    assert profile["category"] == "developer"
    assert profile["skills"] == ["React", "FastAPI"]
    assert profile["github_url"] == "https://github.com/profilefields"
    assert profile["available_for_work"] is True
    assert profile["onboarded"] is True

    public = client.get("/users/profilefields", headers=headers)
    assert public.status_code == 200
    assert public.json()["headline"] == "Frontend engineer"
    assert "email" not in public.json()

    invalid = client.patch(
        "/users/me",
        headers=headers,
        json={"github_url": "github.com/nope"},
    )
    assert invalid.status_code == 422
