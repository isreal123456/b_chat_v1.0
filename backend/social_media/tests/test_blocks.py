"""Block tests: validation, duplicate prevention, and enforcement across the app."""


def create_post(client, session, content):
    response = client.post("/posts", headers=session["headers"], json={"content": content})
    assert response.status_code == 201, response.text
    return response.json()


def test_block_validation_and_round_trip(client, register):
    viewer = register(username="blockviewer")
    target = register(username="blocktarget")

    anonymous = client.post(f"/blocks/{target['user']['id']}")
    assert anonymous.status_code == 401

    self_block = client.post(
        f"/blocks/{viewer['user']['id']}", headers=viewer["headers"]
    )
    assert self_block.status_code == 400

    missing = client.post("/blocks/9999", headers=viewer["headers"])
    assert missing.status_code == 404

    blocked = client.post(
        f"/blocks/{target['user']['id']}", headers=viewer["headers"]
    )
    assert blocked.status_code == 201, blocked.text
    assert blocked.json()["blocked_user_id"] == target["user"]["id"]

    duplicate = client.post(
        f"/blocks/{target['user']['id']}", headers=viewer["headers"]
    )
    assert duplicate.status_code == 400

    status_response = client.get(
        f"/blocks/status/{target['user']['id']}", headers=viewer["headers"]
    )
    assert status_response.json()["blocked"] is True

    listing = client.get("/blocks", headers=viewer["headers"]).json()
    assert [person["username"] for person in listing["blocked_users"]] == ["blocktarget"]

    unblocked = client.delete(
        f"/blocks/{target['user']['id']}", headers=viewer["headers"]
    )
    assert unblocked.status_code == 200
    assert client.delete(
        f"/blocks/{target['user']['id']}", headers=viewer["headers"]
    ).status_code == 404
    assert client.get(
        f"/blocks/status/{target['user']['id']}", headers=viewer["headers"]
    ).json()["blocked"] is False


def test_block_removes_user_from_search_feed_friends_and_conversations(
    client, register, connect_friends
):
    viewer = register(username="blockviewer2")
    target = register(username="blocktarget2")
    connect_friends(viewer, target)

    with client.websocket_connect(
        f"/messages/ws/{target['user']['id']}?token={target['token']}"
    ) as socket:
        socket.send_json(
            {"receiver_id": viewer["user"]["id"], "content": "Before the block"}
        )
        socket.receive_json()

    post = create_post(client, target, "Visible before the block")

    feed_before = client.get("/posts/all_posts?limit=50", headers=viewer["headers"]).json()
    assert post["id"] in {item["id"] for item in feed_before["items"]}
    assert client.get("/conversations", headers=viewer["headers"]).json()

    blocked = client.post(
        f"/blocks/{target['user']['id']}", headers=viewer["headers"]
    )
    assert blocked.status_code == 201, blocked.text

    search = client.get(
        "/users/search?query=blocktarget2", headers=viewer["headers"]
    ).json()
    assert search == []
    reverse_search = client.get(
        "/users/search?query=blockviewer2", headers=target["headers"]
    ).json()
    assert reverse_search == []

    feed_after = client.get("/posts/all_posts?limit=50", headers=viewer["headers"]).json()
    assert post["id"] not in {item["id"] for item in feed_after["items"]}
    assert client.get("/friends", headers=viewer["headers"]).json() == []
    assert client.get("/conversations", headers=viewer["headers"]).json() == []

    connect_again = client.post(
        f"/friends/requests/{viewer['user']['id']}", headers=target["headers"]
    )
    assert connect_again.status_code == 403

    with client.websocket_connect(
        f"/messages/ws/{target['user']['id']}?token={target['token']}"
    ) as socket:
        socket.send_json(
            {"receiver_id": viewer["user"]["id"], "content": "After the block"}
        )
        assert socket.receive_json() == {"error": "You cannot message this user"}

    assert client.get(
        f"/messages/{target['user']['id']}/history", headers=viewer["headers"]
    ).json()[0]["content"] == "Before the block"

    unblocked = client.delete(
        f"/blocks/{target['user']['id']}", headers=viewer["headers"]
    )
    assert unblocked.status_code == 200
    assert client.get(
        "/users/search?query=blocktarget2", headers=viewer["headers"]
    ).json()[0]["username"] == "blocktarget2"
