"""Admin console authorization, moderation workflows, settings, and analytics."""

import asyncio

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.user import User


@pytest.fixture()
def promote(engine):
    def _promote(account: dict, role: str) -> None:
        async def run():
            factory = async_sessionmaker(engine, expire_on_commit=False)
            async with factory() as db:
                user = await db.scalar(
                    select(User).where(User.username == account["user"]["username"])
                )
                assert user is not None
                user.role = role
                await db.commit()

        asyncio.run(run())

    return _promote


@pytest.fixture()
def make_post(client):
    def _make(author, content="A moderation sample"):
        response = client.post(
            "/posts", headers=author["headers"], json={"content": content}
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture()
def make_report(client):
    def _report(reporter, target_type, target_id, reason="spam", details=""):
        response = client.post(
            "/reports",
            headers=reporter["headers"],
            json={
                "target_type": target_type,
                "target_id": target_id,
                "reason": reason,
                "details": details,
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _report


def feed_ids(client, account):
    response = client.get("/posts/all_posts?limit=50", headers=account["headers"])
    assert response.status_code == 200, response.text
    return {item["id"] for item in response.json()["items"]}


def test_admin_rejects_regular_members(client, register):
    member = register(username="plainmember")
    for path in ("/admin/overview", "/admin/users", "/admin/reports", "/admin/settings"):
        assert client.get(path, headers=member["headers"]).status_code == 403
    assert client.get("/admin/overview").status_code == 401


def test_moderator_scope_is_limited(client, register, promote):
    moderator = register(username="scopemod")
    promote(moderator, "moderator")
    target = register(username="scopetarget")

    assert client.get("/admin/overview", headers=moderator["headers"]).status_code == 200
    assert client.get("/admin/reports", headers=moderator["headers"]).status_code == 200
    assert client.get("/admin/users", headers=moderator["headers"]).status_code == 200
    assert client.get("/admin/analytics", headers=moderator["headers"]).status_code == 403
    assert client.get("/admin/settings", headers=moderator["headers"]).status_code == 403
    assert client.get("/admin/activity", headers=moderator["headers"]).status_code == 403
    suspended = client.post(
        f"/admin/users/{target['user']['id']}/suspend",
        headers=moderator["headers"],
        json={"reason": "Testing moderator limits"},
    )
    assert suspended.status_code == 403


def test_admin_scope_cannot_manage_roles_or_settings(client, register, promote):
    admin = register(username="scopeadmin")
    promote(admin, "admin")
    target = register(username="scopeadminTarget")

    assert client.get("/admin/analytics", headers=admin["headers"]).status_code == 200
    assert client.get("/admin/settings", headers=admin["headers"]).status_code == 200
    assert (
        client.patch(
            "/admin/settings",
            headers=admin["headers"],
            json={"registration_enabled": False},
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/admin/users/{target['user']['id']}/role",
            headers=admin["headers"],
            json={"role": "admin"},
        ).status_code
        == 403
    )
    assert (
        client.request(
            "DELETE",
            f"/admin/users/{target['user']['id']}",
            headers=admin["headers"],
            json={"confirm": target["user"]["username"]},
        ).status_code
        == 403
    )


def test_admin_cannot_manage_super_admin_or_self(client, register, promote):
    super_admin = register(username="superscope")
    promote(super_admin, "super_admin")
    admin = register(username="scopepeon")
    promote(admin, "admin")

    assert (
        client.post(
            f"/admin/users/{super_admin['user']['id']}/suspend",
            headers=admin["headers"],
            json={"reason": "Not allowed"},
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/admin/users/{super_admin['user']['id']}/role",
            headers=super_admin["headers"],
            json={"role": "admin"},
        ).status_code
        == 400
    )
    assert (
        client.patch(
            f"/admin/users/{super_admin['user']['id']}",
            headers=super_admin["headers"],
            json={"name": "Self edit"},
        ).status_code
        == 400
    )


def test_user_search_edit_and_status_flow(client, register, promote):
    super_admin = register(username="usermaster")
    promote(super_admin, "super_admin")
    target = register(username="statusmember", name="Status Member")

    listing = client.get(
        "/admin/users?q=statusmember", headers=super_admin["headers"]
    ).json()
    assert listing["total"] == 1
    assert listing["items"][0]["email"] == target["email"]

    edited = client.patch(
        f"/admin/users/{target['user']['id']}",
        headers=super_admin["headers"],
        json={
            "name": "Renamed Member",
            "headline": "Backend engineer",
            "category": "developer",
            "skills": ["Python", "FastAPI"],
            "role": "admin",
        },
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["name"] == "Renamed Member"
    assert edited.json()["skills"] == ["Python", "FastAPI"]
    assert edited.json()["role"] == "user"

    duplicate = client.patch(
        f"/admin/users/{target['user']['id']}",
        headers=super_admin["headers"],
        json={"username": super_admin["user"]["username"]},
    )
    assert duplicate.status_code == 409

    suspended = client.post(
        f"/admin/users/{target['user']['id']}/suspend",
        headers=super_admin["headers"],
        json={"reason": "Repeated spam"},
    )
    assert suspended.status_code == 200
    assert suspended.json()["account_status"] == "suspended"
    assert client.get("/users/me", headers=target["headers"]).status_code == 403
    login = client.post(
        "/auth/login",
        data={"username": target["email"], "password": target["password"]},
    )
    assert login.status_code == 403

    assert (
        client.post(
            f"/admin/users/{target['user']['id']}/suspend",
            headers=super_admin["headers"],
            json={"reason": "Again"},
        ).status_code
        == 409
    )
    restored = client.post(
        f"/admin/users/{target['user']['id']}/restore",
        headers=super_admin["headers"],
    )
    assert restored.status_code == 200
    assert restored.json()["account_status"] == "active"
    assert client.get("/users/me", headers=target["headers"]).status_code == 200

    logs = client.get(
        "/admin/activity?action=user.suspend", headers=super_admin["headers"]
    ).json()
    assert logs["total"] >= 1
    assert logs["items"][0]["target_id"] == target["user"]["id"]


def test_permanent_deletion_requires_username(client, register, promote, make_post):
    super_admin = register(username="deletemaster")
    promote(super_admin, "super_admin")
    target = register(username="deletemember")
    post = make_post(target, "This disappears with the member")

    wrong = client.request(
        "DELETE",
        f"/admin/users/{target['user']['id']}",
        headers=super_admin["headers"],
        json={"confirm": "not-the-username"},
    )
    assert wrong.status_code == 400

    deleted = client.request(
        "DELETE",
        f"/admin/users/{target['user']['id']}",
        headers=super_admin["headers"],
        json={"confirm": target["user"]["username"], "reason": "Spam account"},
    )
    assert deleted.status_code == 200, deleted.text
    assert client.get("/users/me", headers=target["headers"]).status_code == 401
    assert post["id"] not in feed_ids(client, super_admin)
    assert (
        client.get(
            f"/admin/users/{target['user']['id']}", headers=super_admin["headers"]
        ).status_code
        == 404
    )
    logs = client.get(
        "/admin/activity?action=user.delete", headers=super_admin["headers"]
    ).json()
    assert logs["items"][0]["details"]["username"] == target["user"]["username"]


def test_post_removal_and_restore(client, register, promote, make_post):
    super_admin = register(username="postmaster")
    promote(super_admin, "super_admin")
    author = register(username="postauthor")
    post = make_post(author, "Content that will be moderated")

    assert post["id"] in feed_ids(client, author)

    removed = client.post(
        f"/admin/posts/{post['id']}/remove",
        headers=super_admin["headers"],
        json={"reason": "Contains misleading claims"},
    )
    assert removed.status_code == 200, removed.text
    assert removed.json()["moderation_status"] == "removed"
    assert post["id"] not in feed_ids(client, author)
    assert (
        client.post(
            f"/admin/posts/{post['id']}/remove",
            headers=super_admin["headers"],
            json={"reason": "Again"},
        ).status_code
        == 409
    )

    detail = client.get(
        f"/admin/posts/{post['id']}", headers=super_admin["headers"]
    ).json()
    assert detail["removal_reason"] == "Contains misleading claims"

    restored = client.post(
        f"/admin/posts/{post['id']}/restore", headers=super_admin["headers"]
    )
    assert restored.status_code == 200
    assert post["id"] in feed_ids(client, author)

    logs = client.get(
        "/admin/activity?target_type=post", headers=super_admin["headers"]
    ).json()
    actions = {item["action"] for item in logs["items"]}
    assert {"content.remove", "content.restore"}.issubset(actions)


def test_comment_moderation_hides_from_post(client, register, promote, make_post):
    super_admin = register(username="commentmaster")
    promote(super_admin, "super_admin")
    author = register(username="commentauthor")
    commenter = register(username="commentwriter")
    post = make_post(author, "Comment moderation target")
    created = client.post(
        "/comments/",
        headers=commenter["headers"],
        json={"post_id": post["id"], "content": "Reported comment"},
    )
    assert created.status_code == 201, created.text
    comment_id = created.json()["id"]

    removed = client.post(
        f"/admin/comments/{comment_id}/remove",
        headers=super_admin["headers"],
        json={"reason": "Harassment"},
    )
    assert removed.status_code == 200
    listed = client.get(
        f"/comments/posts/{post['id']}/comments", headers=author["headers"]
    ).json()
    assert comment_id not in {item["id"] for item in listed}

    restored = client.post(
        f"/admin/comments/{comment_id}/restore", headers=super_admin["headers"]
    )
    assert restored.status_code == 200
    listed = client.get(
        f"/comments/posts/{post['id']}/comments", headers=author["headers"]
    ).json()
    assert comment_id in {item["id"] for item in listed}


def test_report_resolution_removes_content_and_notifies_reporter(
    client, register, promote, make_post, make_report
):
    super_admin = register(username="reportmaster")
    promote(super_admin, "super_admin")
    author = register(username="reportauthor")
    reporter = register(username="reportreporter")
    post = make_post(author, "Reported post content")
    report = make_report(reporter, "post", post["id"], reason="harassment", details="Targeted abuse")

    queue = client.get("/admin/reports", headers=super_admin["headers"]).json()
    assert queue["counts"]["pending"] >= 1
    assert queue["items"][0]["target"]["status"] == "published"

    reviewed = client.patch(
        f"/admin/reports/{report['id']}",
        headers=super_admin["headers"],
        json={"status": "under_review", "resolution_note": "Investigating"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "under_review"

    resolved = client.patch(
        f"/admin/reports/{report['id']}",
        headers=super_admin["headers"],
        json={
            "status": "resolved",
            "resolution_note": "Violates the harassment policy",
            "resolution_action": "content_removed",
        },
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["target"]["status"] == "removed"
    assert post["id"] not in feed_ids(client, author)

    notifications = client.get("/notifications", headers=reporter["headers"]).json()
    assert "report_update" in {item["type"] for item in notifications}

    assert (
        client.patch(
            f"/admin/reports/{report['id']}",
            headers=super_admin["headers"],
            json={"status": "dismissed", "resolution_note": "Closed already"},
        ).status_code
        == 409
    )
    logs = client.get(
        "/admin/activity?action=report.resolve", headers=super_admin["headers"]
    ).json()
    assert logs["total"] >= 1


def test_invalid_report_can_be_dismissed(client, register, promote, make_post, make_report):
    super_admin = register(username="dismissmaster")
    promote(super_admin, "super_admin")
    author = register(username="dismissauthor")
    reporter = register(username="dismissreporter")
    post = make_post(author, "Perfectly fine post")
    report = make_report(reporter, "post", post["id"], reason="spam")

    dismissed = client.patch(
        f"/admin/reports/{report['id']}",
        headers=super_admin["headers"],
        json={
            "status": "dismissed",
            "resolution_note": "Not a violation after review",
            "resolution_action": "none",
        },
    )
    assert dismissed.status_code == 200
    assert dismissed.json()["status"] == "dismissed"
    assert dismissed.json()["target"]["status"] == "published"

    missing_note = make_report(reporter, "post", post["id"], reason="other")
    blocked = client.patch(
        f"/admin/reports/{missing_note['id']}",
        headers=super_admin["headers"],
        json={"status": "resolved", "resolution_note": ""},
    )
    assert blocked.status_code == 400


def test_auto_hide_threshold_and_duplicate_reports(
    client, register, promote, make_post, make_report
):
    super_admin = register(username="thresholdmaster")
    promote(super_admin, "super_admin")
    author = register(username="thresholdauthor")
    first = register(username="thresholdone")
    second = register(username="thresholdtwo")
    post = make_post(author, "Content that gathers reports")

    try:
        updated = client.patch(
            "/admin/settings",
            headers=super_admin["headers"],
            json={"auto_hide_report_threshold": 2},
        )
        assert updated.status_code == 200

        make_report(first, "post", post["id"])
        duplicate = client.post(
            "/reports",
            headers=first["headers"],
            json={"target_type": "post", "target_id": post["id"], "reason": "spam"},
        )
        assert duplicate.status_code == 409
        self_report = client.post(
            "/reports",
            headers=author["headers"],
            json={"target_type": "post", "target_id": post["id"], "reason": "spam"},
        )
        assert self_report.status_code == 400
        assert post["id"] in feed_ids(client, author)

        make_report(second, "post", post["id"], reason="inappropriate")
        assert post["id"] not in feed_ids(client, author)
        logs = client.get(
            "/admin/activity?action=content.auto_hide", headers=super_admin["headers"]
        ).json()
        assert logs["total"] >= 1
    finally:
        client.patch(
            "/admin/settings",
            headers=super_admin["headers"],
            json={"auto_hide_report_threshold": 3},
        )


def test_project_moderation_and_featured(client, register, promote):
    super_admin = register(username="projectmaster")
    promote(super_admin, "super_admin")
    owner = register(username="projectowneradmin")
    created = client.post(
        "/projects",
        headers=owner["headers"],
        json={
            "title": "Admin Reviewed Tool",
            "tagline": "A project that needs oversight",
            "tech_stack": ["React", "FastAPI"],
            "status": "in_progress",
        },
    )
    assert created.status_code == 201, created.text
    project_id = created.json()["id"]

    featured = client.post(
        f"/admin/projects/{project_id}/feature",
        headers=super_admin["headers"],
        json={"featured": True},
    )
    assert featured.status_code == 200, featured.text
    assert featured.json()["featured"] is True
    listing = client.get("/projects", headers=owner["headers"]).json()
    assert listing["items"][0]["id"] == project_id
    assert listing["items"][0]["featured"] is True

    assert (
        client.post(
            f"/admin/projects/{project_id}/feature",
            headers=super_admin["headers"],
            json={"featured": True},
        ).status_code
        == 409
    )

    removed = client.post(
        f"/admin/projects/{project_id}/remove",
        headers=super_admin["headers"],
        json={"reason": "Misleading project claims"},
    )
    assert removed.status_code == 200
    assert removed.json()["featured"] is False
    assert client.get(f"/projects/{project_id}", headers=owner["headers"]).status_code == 404

    assert (
        client.post(
            f"/admin/projects/{project_id}/feature",
            headers=super_admin["headers"],
            json={"featured": True},
        ).status_code
        == 400
    )

    restored = client.post(
        f"/admin/projects/{project_id}/restore", headers=super_admin["headers"]
    )
    assert restored.status_code == 200
    assert client.get(f"/projects/{project_id}", headers=owner["headers"]).status_code == 200


def test_registration_and_maintenance_settings(client, register, promote):
    super_admin = register(username="settingsmaster")
    promote(super_admin, "super_admin")
    outsider = register(username="settingsoutsider")

    try:
        closed = client.patch(
            "/admin/settings",
            headers=super_admin["headers"],
            json={"registration_enabled": False},
        )
        assert closed.status_code == 200
        denied = client.post(
            "/auth/register",
            json={
                "username": "blockedjoiner",
                "name": "Blocked Joiner",
                "email": "blockedjoiner@example.com",
                "password": "secure-password-123",
                "terms_accepted": True,
            },
        )
        assert denied.status_code == 403

        maintenance = client.patch(
            "/admin/settings",
            headers=super_admin["headers"],
            json={
                "maintenance_mode": True,
                "maintenance_message": "Back shortly.",
            },
        )
        assert maintenance.status_code == 200
        blocked = client.get("/posts/all_posts", headers=outsider["headers"])
        assert blocked.status_code == 503
        assert blocked.json()["maintenance"] is True
        assert client.get("/platform/status").json()["maintenance_mode"] is True
        assert client.get("/admin/overview", headers=super_admin["headers"]).status_code == 200
    finally:
        client.patch(
            "/admin/settings",
            headers=super_admin["headers"],
            json={"registration_enabled": True, "maintenance_mode": False},
        )

    status = client.get("/platform/status").json()
    assert status["maintenance_mode"] is False
    assert status["registration_enabled"] is True
    logs = client.get(
        "/admin/activity?action=settings.update", headers=super_admin["headers"]
    ).json()
    assert logs["total"] >= 2


def test_overview_and_analytics_use_live_data(client, register, promote, make_post):
    super_admin = register(username="analyticsmaster")
    promote(super_admin, "super_admin")
    developer = register(username="analyticdev")
    client.patch(
        "/users/me",
        headers=developer["headers"],
        json={
            "category": "developer",
            "skills": ["Python", "React"],
            "headline": "Analytics engineer",
        },
    )
    designer = register(username="analyticdesign")
    client.patch(
        "/users/me",
        headers=designer["headers"],
        json={"category": "designer", "skills": ["Figma"]},
    )
    post = make_post(developer, "Analytics post")
    ticked = client.post(f"/ticks/{post['id']}", headers=designer["headers"])
    assert ticked.status_code == 201, ticked.text

    overview = client.get("/admin/overview", headers=super_admin["headers"]).json()
    totals = overview["totals"]
    assert totals["users"] >= 3
    assert totals["active_users"] >= 3
    assert totals["developers"] >= 1
    assert totals["designers"] >= 1
    assert totals["posts"] >= 1
    assert totals["ticks"] >= 1
    assert totals["pending_reports"] >= 0

    chart = client.get(
        "/admin/overview/activity?days=7", headers=super_admin["headers"]
    ).json()
    assert len(chart["labels"]) == 7
    assert sum(chart["registrations"]) >= 3
    assert chart["dau"][-1] >= 1

    analytics = client.get(
        "/admin/analytics?range=7d", headers=super_admin["headers"]
    ).json()
    assert analytics["totals"]["posts"] >= 1
    assert len(analytics["trends"]["labels"]) == 7
    technologies = {item["name"].lower() for item in analytics["technologies"]}
    assert "python" in technologies and "figma" in technologies
    assert any(
        item["user"]["username"] == developer["user"]["username"]
        for item in analytics["most_active_users"]
    )
    assert any(item["id"] == post["id"] for item in analytics["most_ticked_posts"])
    assert analytics["interval_totals"]["daily"]["active_users"] >= 1


def test_activity_log_pagination(client, register, promote):
    super_admin = register(username="logmaster")
    promote(super_admin, "super_admin")
    target = register(username="logtarget")
    client.post(
        f"/admin/users/{target['user']['id']}/suspend",
        headers=super_admin["headers"],
        json={"reason": "Audit test"},
    )

    first = client.get(
        "/admin/activity?page=1&page_size=1", headers=super_admin["headers"]
    ).json()
    assert first["total"] >= 1
    assert first["page_size"] == 1
    assert len(first["items"]) == 1
    assert first["items"][0]["admin"]["username"] == super_admin["user"]["username"]
    assert first["items"][0]["created_at"]
