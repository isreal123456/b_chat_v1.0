"""Feed 2.0 tests: pagination, reposts, bookmarks, project updates, ranking."""

from app.services.feed_service import (
    calculate_behavioral_affinity,
    calculate_feed_score,
    calculate_interest_match,
)


def create_post(client, session, content, **extra):
    response = client.post(
        "/posts", headers=session["headers"], json={"content": content, **extra}
    )
    assert response.status_code == 201, response.text
    return response.json()


def fetch_feed(client, session, **params):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    url = f"/posts/all_posts?{query}" if query else "/posts/all_posts"
    response = client.get(url, headers=session["headers"])
    assert response.status_code == 200, response.text
    return response.json()


def test_feed_is_paginated(client, register):
    author = register(username="feedwriter")
    for index in range(5):
        create_post(client, author, f"Pagination note {index}")

    first = fetch_feed(client, author, limit=2, offset=0)
    assert first["total"] == 5
    assert len(first["items"]) == 2
    assert first["limit"] == 2

    second = fetch_feed(client, author, limit=2, offset=2)
    assert len(second["items"]) == 2
    assert {item["id"] for item in first["items"]}.isdisjoint(
        {item["id"] for item in second["items"]}
    )

    tail = fetch_feed(client, author, limit=2, offset=4)
    assert len(tail["items"]) == 1

    assert client.get(
        "/posts/all_posts?limit=0", headers=author["headers"]
    ).status_code == 422


def test_author_filter_returns_profile_posts(client, register):
    writer = register(username="profilewriter")
    other = register(username="profileother")
    create_post(client, writer, "Writer note")
    create_post(client, other, "Other note")

    page = fetch_feed(client, writer, author="profilewriter")
    assert page["total"] == 1
    assert page["items"][0]["username"] == "profilewriter"


def test_repost_flow(client, register):
    author = register(username="repostauthor")
    booster = register(username="repostbooster")
    post = create_post(client, author, "Ship it with a repost")

    reposted = client.post(f"/shares/{post['id']}", headers=booster["headers"])
    assert reposted.status_code == 201, reposted.text
    assert reposted.json() == {
        "post_id": post["id"],
        "shared": True,
        "share_count": 1,
    }

    duplicate = client.post(f"/shares/{post['id']}", headers=booster["headers"])
    assert duplicate.status_code == 400

    booster_feed = fetch_feed(client, booster, limit=50)
    item = next(entry for entry in booster_feed["items"] if entry["id"] == post["id"])
    assert item["reposted_by"]["username"] == "repostbooster"
    assert item["feed_id"].startswith("share-")
    assert item["share_count"] == 1
    assert item["shared"] is True

    notifications = client.get("/notifications", headers=author["headers"]).json()
    assert "repost" in {notification["type"] for notification in notifications}

    undo = client.delete(f"/shares/{post['id']}", headers=booster["headers"])
    assert undo.status_code == 200
    assert undo.json()["share_count"] == 0
    assert client.delete(
        f"/shares/{post['id']}", headers=booster["headers"]
    ).status_code == 404


def test_bookmarks_round_trip(client, register):
    author = register(username="saveauthor")
    reader = register(username="savereader")
    post = create_post(client, author, "Something worth keeping")

    saved = client.post(f"/saves/{post['id']}", headers=reader["headers"])
    assert saved.status_code == 201, saved.text
    assert saved.json()["saved"] is True
    assert saved.json()["save_count"] == 1

    bookmarks = client.get("/saves", headers=reader["headers"]).json()
    assert bookmarks["total"] == 1
    assert bookmarks["items"][0]["id"] == post["id"]
    assert bookmarks["items"][0]["saved"] is True

    removed = client.delete(f"/saves/{post['id']}", headers=reader["headers"])
    assert removed.status_code == 200
    assert client.get("/saves", headers=reader["headers"]).json()["items"] == []
    assert client.delete(
        f"/saves/{post['id']}", headers=reader["headers"]
    ).status_code == 404


def test_project_updates_attach_to_feed_posts(client, register):
    owner = register(username="feedprojectowner")
    stranger = register(username="feedprojectstranger")
    project = client.post(
        "/projects",
        headers=owner["headers"],
        json={"title": "Feed Project", "tagline": "Ships in public"},
    ).json()

    post = create_post(client, owner, "Milestone: auth is done", project_id=project["id"])
    assert post["project"]["id"] == project["id"]

    feed = fetch_feed(client, owner, limit=50)
    item = next(entry for entry in feed["items"] if entry["id"] == post["id"])
    assert item["project"]["title"] == "Feed Project"

    forbidden = client.post(
        "/posts",
        headers=stranger["headers"],
        json={"content": "Hijack", "project_id": project["id"]},
    )
    assert forbidden.status_code == 403

    missing = client.post(
        "/posts",
        headers=owner["headers"],
        json={"content": "Ghost project", "project_id": 9999},
    )
    assert missing.status_code == 404


def test_interest_and_affinity_signals():
    assert calculate_interest_match(set(), set(), "", "") == 0.0

    overlap = calculate_interest_match(
        {"react", "typescript"}, {"react", "fastapi"}, "developer", "designer"
    )
    assert overlap > 0.0

    aligned = calculate_interest_match(
        {"react", "typescript"},
        {"react", "typescript"},
        "developer",
        "developer",
        "developer",
    )
    assert aligned == 1.0

    assert calculate_behavioral_affinity(0) == 0.0
    assert calculate_behavioral_affinity(6) > calculate_behavioral_affinity(1)
    assert calculate_behavioral_affinity(1000) == 1.0

    passive = calculate_feed_score(
        engagement=0.5,
        recency=0.5,
        is_followed=False,
        is_own_post=False,
        interest_match=0.0,
        affinity=0.0,
    )
    personalised = calculate_feed_score(
        engagement=0.5,
        recency=0.5,
        is_followed=True,
        is_own_post=False,
        interest_match=1.0,
        affinity=1.0,
    )
    assert personalised > passive
