"""Follow graph tests."""

import pytest


def test_follow_and_unfollow_updates_counts_and_profile(client, register):
    creator = register(username="followcreator")
    viewer = register(username="followviewer")

    followed = client.post(
        f"/users/{creator['user']['id']}/follow", headers=viewer["headers"]
    )
    assert followed.status_code == 200, followed.text
    assert followed.json() == {"following": True, "follower_count": 1}

    profile = client.get(f"/users/{creator['user']['username']}", headers=viewer["headers"])
    assert profile.status_code == 200
    body = profile.json()
    assert body["is_following"] is True
    assert body["follower_count"] == 1
    assert "email" not in body

    me = client.get("/users/me", headers=viewer["headers"]).json()
    assert me["following_count"] == 1
    assert me["follower_count"] == 0

    unfollowed = client.delete(
        f"/users/{creator['user']['id']}/follow", headers=viewer["headers"]
    )
    assert unfollowed.status_code == 200, unfollowed.text
    assert unfollowed.json() == {"following": False, "follower_count": 0}

    profile = client.get(f"/users/{creator['user']['username']}", headers=viewer["headers"])
    assert profile.json()["is_following"] is False


def test_follow_is_idempotent_and_notifies_once(client, register):
    creator = register(username="followtarget")
    viewer = register(username="followfan")

    client.post(f"/users/{creator['user']['id']}/follow", headers=viewer["headers"])
    again = client.post(f"/users/{creator['user']['id']}/follow", headers=viewer["headers"])
    assert again.status_code == 200
    assert again.json()["follower_count"] == 1

    notifications = client.get("/notifications", headers=creator["headers"]).json()
    follow_notifications = [item for item in notifications if item["type"] == "follow"]
    assert len(follow_notifications) == 1
    assert "started following" in follow_notifications[0]["message"]


def test_cannot_follow_self(client, register):
    user = register(username="selflover")
    response = client.post(f"/users/{user['user']['id']}/follow", headers=user["headers"])
    assert response.status_code == 400


def test_follow_unknown_user_returns_404(client, register):
    user = register(username="followghost")
    response = client.post("/users/999999/follow", headers=user["headers"])
    assert response.status_code == 404


def test_followers_and_following_lists_are_paginated(client, register):
    target = register(username="listtarget")
    first = register(username="listfirst")
    second = register(username="listsecond")

    for viewer in (first, second):
        client.post(f"/users/{target['user']['id']}/follow", headers=viewer["headers"])

    followers = client.get(
        f"/users/{target['user']['username']}/followers?limit=1&offset=0",
        headers=first["headers"],
    )
    assert followers.status_code == 200
    page = followers.json()
    assert len(page) == 1
    assert page[0]["id"] in {first["user"]["id"], second["user"]["id"]}

    following = client.get(
        f"/users/{first['user']['username']}/following",
        headers=target["headers"],
    )
    assert following.status_code == 200
    assert [item["id"] for item in following.json()] == [target["user"]["id"]]
    assert following.json()[0]["is_following"] is False


def test_following_creator_boosts_feed_visibility(client, register):
    creator = register(username="boostcreator")
    viewer = register(username="boostviewer")

    post = client.post(
        "/posts", headers=creator["headers"], json={"content": "A fresh project update"}
    )
    assert post.status_code == 201, post.text

    before = client.get("/posts/all_posts", headers=viewer["headers"]).json()["items"]
    assert all(entry["followed"] is False for entry in before if entry["user_id"] == creator["user"]["id"])

    client.post(f"/users/{creator['user']['id']}/follow", headers=viewer["headers"])

    after = client.get("/posts/all_posts", headers=viewer["headers"]).json()["items"]
    matching = [entry for entry in after if entry["user_id"] == creator["user"]["id"]]
    assert matching and matching[0]["followed"] is True


def test_follow_respects_notification_preferences(client, register):
    creator = register(username="quietcreator")
    viewer = register(username="quietfan")

    updated = client.put(
        "/users/me/preferences",
        headers=creator["headers"],
        json={"follows": False},
    )
    assert updated.status_code == 200, updated.text

    client.post(f"/users/{creator['user']['id']}/follow", headers=viewer["headers"])

    notifications = client.get("/notifications", headers=creator["headers"]).json()
    assert all(item["type"] != "follow" for item in notifications)
