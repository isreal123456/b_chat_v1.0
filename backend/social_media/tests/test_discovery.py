"""Discovery tests: search, recommended people, trending updates, trending skills."""


def update_profile(client, session, **fields):
    response = client.patch("/users/me", headers=session["headers"], json=fields)
    assert response.status_code == 200, response.text
    return response.json()


def create_post(client, session, content):
    response = client.post("/posts", headers=session["headers"], json={"content": content})
    assert response.status_code == 201, response.text
    return response.json()


def test_search_matches_skills_headline_and_bio(client, register):
    viewer = register(username="searchviewer")
    builder = register(username="rustbuilder")
    update_profile(
        client,
        builder,
        headline="Rust and FastAPI specialist",
        skills=["Rust", "FastAPI"],
        category="developer",
    )
    update_profile(client, viewer, skills=["React"])

    by_skill = client.get("/users/search?query=fastapi", headers=viewer["headers"])
    assert by_skill.status_code == 200, by_skill.text
    assert [user["username"] for user in by_skill.json()] == ["rustbuilder"]
    assert by_skill.json()[0]["is_following"] is False

    by_headline = client.get("/users/search?query=specialist", headers=viewer["headers"])
    assert [user["username"] for user in by_headline.json()] == ["rustbuilder"]

    limited = client.get("/users/search?query=&limit=1", headers=viewer["headers"])
    assert limited.status_code == 200
    assert len(limited.json()) == 1


def test_suggested_people_rank_shared_skills_and_mutuals(
    client, register, connect_friends
):
    viewer = register(username="suggestviewer")
    connected = register(username="suggestconnected")
    aligned = register(username="suggestaligned")
    unrelated = register(username="suggestunrelated")
    pending = register(username="suggestpending")

    update_profile(client, viewer, skills=["React"], category="developer")
    update_profile(client, aligned, skills=["React", "TypeScript"], category="developer")
    update_profile(client, unrelated, skills=["Figma"], category="designer")
    update_profile(client, pending, skills=["React"], category="developer")

    connect_friends(viewer, connected)
    connect_friends(connected, aligned)

    sent = client.post(
        f"/friends/requests/{pending['user']['id']}", headers=viewer["headers"]
    )
    assert sent.status_code == 201, sent.text

    response = client.get("/discovery/suggested-people?limit=10", headers=viewer["headers"])
    assert response.status_code == 200, response.text
    payload = response.json()
    usernames = [person["username"] for person in payload["items"]]

    assert "suggestconnected" not in usernames
    assert "suggestpending" not in usernames
    assert "suggestviewer" not in usernames
    assert usernames.index("suggestaligned") < usernames.index("suggestunrelated")

    aligned_item = payload["items"][0]
    assert aligned_item["username"] == "suggestaligned"
    assert aligned_item["mutual_connections"] == 1
    assert {skill.lower() for skill in aligned_item["shared_skills"]} == {"react"}
    assert aligned_item["is_following"] is False


def test_trending_updates_order_by_engagement(client, register):
    viewer = register(username="trendviewer")
    author = register(username="trendauthor")
    other = register(username="trendother")
    tucker = register(username="trendtucker")

    quiet = create_post(client, other, "Quiet update")
    popular = create_post(client, author, "Popular update")

    ticked = client.post(f"/ticks/{popular['id']}", headers=tucker["headers"])
    assert ticked.status_code == 201, ticked.text
    commented = client.post(
        "/comments/",
        headers=viewer["headers"],
        json={"post_id": popular["id"], "content": "This is the one"},
    )
    assert commented.status_code == 201, commented.text

    response = client.get("/discovery/trending?days=7&limit=5", headers=viewer["headers"])
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["window_days"] == 7
    assert payload["items"][0]["id"] == popular["id"]
    assert {item["id"] for item in payload["items"]} >= {popular["id"], quiet["id"]}


def test_trending_skills_aggregates_across_profiles(client, register):
    viewer = register(username="skillviewer")
    first = register(username="skillfirst")
    second = register(username="skillsecond")
    update_profile(client, first, skills=["React", "FastAPI"])
    update_profile(client, second, skills=["react", "PostgreSQL"])

    response = client.get("/discovery/trending-skills?limit=5", headers=viewer["headers"])
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert next(item for item in items if item["name"].lower() == "react")["count"] == 2
    assert any(item["name"].lower() == "fastapi" for item in items)
