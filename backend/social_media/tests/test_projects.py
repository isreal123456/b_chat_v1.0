"""Project showcase tests."""

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"tickme-cover"


def create_project(client, session, **overrides):
    payload = {
        "title": "Realtime Collab Board",
        "tagline": "A shared canvas for design critiques",
        "description": "Live cursors, threads, and version history for small teams.",
        "category": "designer",
        "tech_stack": ["React", "TypeScript", "FastAPI"],
        "repo_url": "https://github.com/example/board",
        "live_url": "https://board.example.com",
        "status": "in_progress",
        "looking_for_collaborators": True,
        **overrides,
    }
    response = client.post("/projects", headers=session["headers"], json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_fetch_project(client, register):
    owner = register(username="projectowner")
    project = create_project(client, owner)

    assert project["title"] == "Realtime Collab Board"
    assert project["tech_stack"] == ["React", "TypeScript", "FastAPI"]
    assert project["is_owner"] is True
    assert project["owner"]["username"] == "projectowner"

    fetched = client.get(f"/projects/{project['id']}", headers=owner["headers"])
    assert fetched.status_code == 200
    assert fetched.json()["id"] == project["id"]

    viewer = register(username="projectviewer")
    viewed = client.get(f"/projects/{project['id']}", headers=viewer["headers"]).json()
    assert viewed["is_owner"] is False


def test_project_validation_and_normalization(client, register):
    owner = register(username="projectvalidator")

    bad_url = client.post(
        "/projects",
        headers=owner["headers"],
        json={"title": "Bad link", "repo_url": "github.com/not-a-url"},
    )
    assert bad_url.status_code == 422

    blank_title = client.post(
        "/projects", headers=owner["headers"], json={"title": "   "}
    )
    assert blank_title.status_code == 422

    project = create_project(
        client,
        owner,
        tech_stack=["React", "react", "  TypeScript  "] + [f"Tool{i}" for i in range(20)],
    )
    assert project["tech_stack"][:2] == ["React", "TypeScript"]
    assert len(project["tech_stack"]) == 12


def test_only_owner_can_update_or_delete(client, register):
    owner = register(username="projectauthor")
    stranger = register(username="projectstranger")
    project = create_project(client, owner)

    forbidden = client.patch(
        f"/projects/{project['id']}",
        headers=stranger["headers"],
        json={"title": "Hijacked"},
    )
    assert forbidden.status_code == 403

    updated = client.patch(
        f"/projects/{project['id']}",
        headers=owner["headers"],
        json={"status": "shipped", "tagline": "Now shipped"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "shipped"
    assert updated.json()["tagline"] == "Now shipped"
    assert updated.json()["title"] == "Realtime Collab Board"

    deleted = client.delete(f"/projects/{project['id']}", headers=owner["headers"])
    assert deleted.status_code == 204

    gone = client.get(f"/projects/{project['id']}", headers=owner["headers"])
    assert gone.status_code == 404


def test_project_listing_filters_and_pagination(client, register):
    owner = register(username="projectlister")
    create_project(client, owner, title="Alpha Dev Tool", category="developer")
    create_project(client, owner, title="Beta Design Kit", category="designer")
    create_project(client, owner, title="Gamma Dev Tool", category="developer")

    page = client.get("/projects?limit=2&offset=0", headers=owner["headers"]).json()
    assert page["total"] == 3
    assert len(page["items"]) == 2
    assert {item["title"] for item in page["items"]}.issubset(
        {"Alpha Dev Tool", "Beta Design Kit", "Gamma Dev Tool"}
    )

    designers = client.get(
        "/projects?category=designer", headers=owner["headers"]
    ).json()
    assert [item["title"] for item in designers["items"]] == ["Beta Design Kit"]

    search = client.get(
        "/projects?query=Alpha", headers=owner["headers"]
    ).json()
    assert [item["title"] for item in search["items"]] == ["Alpha Dev Tool"]

    per_user = client.get(
        f"/users/{owner['user']['username']}/projects",
        headers=owner["headers"],
    ).json()
    assert per_user["total"] == 3


def test_project_cover_upload_and_removal(client, register):
    owner = register(username="projectcover")
    stranger = register(username="projectcoverstranger")
    project = create_project(client, owner)

    blocked = client.put(
        f"/projects/{project['id']}/cover",
        headers=stranger["headers"],
        files={"image": ("cover.png", PNG_BYTES, "image/png")},
    )
    assert blocked.status_code == 403

    uploaded = client.put(
        f"/projects/{project['id']}/cover",
        headers=owner["headers"],
        files={"image": ("cover.png", PNG_BYTES, "image/png")},
    )
    assert uploaded.status_code == 200

    cover = client.get(f"/projects/{project['id']}/cover")
    assert cover.status_code == 200
    assert cover.content == PNG_BYTES
    assert cover.headers["content-type"].startswith("image/png")

    fake = client.put(
        f"/projects/{project['id']}/cover",
        headers=owner["headers"],
        files={"image": ("cover.png", b"not-an-image", "image/png")},
    )
    assert fake.status_code == 415

    removed = client.delete(
        f"/projects/{project['id']}/cover", headers=owner["headers"]
    )
    assert removed.status_code == 204
    assert client.get(f"/projects/{project['id']}/cover").status_code == 404


def test_projects_require_authentication(client):
    assert client.get("/projects").status_code == 401
    assert client.post("/projects", json={"title": "Nope"}).status_code == 401
