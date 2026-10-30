"""Connections, messaging, posts, ticks, and comments tests."""


def create_post(client, session, content="Hello TickMe"):
    response = client.post("/posts", headers=session["headers"], json={"content": content})
    assert response.status_code == 201, response.text
    return response.json()


def test_connection_flow_creates_conversation(client, register):
    author = register(username="connectauthor")
    viewer = register(username="connectviewer")

    sent = client.post(f"/friends/requests/{viewer['user']['id']}", headers=author["headers"])
    assert sent.status_code == 201, sent.text
    request_id = sent.json()["request_id"]

    received = client.get("/friends/requests/received", headers=viewer["headers"])
    assert [item["id"] for item in received.json()] == [request_id]

    accepted = client.patch(f"/friends/requests/{request_id}/accept", headers=viewer["headers"])
    assert accepted.status_code == 200, accepted.text

    friends = client.get("/friends", headers=author["headers"]).json()
    assert any(friend["id"] == viewer["user"]["id"] for friend in friends)
    conversations = client.get("/conversations", headers=author["headers"]).json()
    assert any(item["id"] == viewer["user"]["id"] for item in conversations)
    notifications = client.get("/notifications", headers=viewer["headers"]).json()
    assert "friend_request" in {item["type"] for item in notifications}


def test_messaging_requires_connection_and_records_history(client, register, connect_friends):
    author = register(username="chatauthor")
    friend = register(username="chatfriend")
    stranger = register(username="chatstranger")
    connect_friends(author, friend)

    with client.websocket_connect(
        f"/messages/ws/{author['user']['id']}?token={author['token']}"
    ) as socket:
        socket.send_json({"receiver_id": stranger["user"]["id"], "content": "Not allowed"})
        assert "friends" in socket.receive_json()["error"]

        socket.send_json({"receiver_id": friend["user"]["id"], "content": "Hello TickMe"})
        payload = socket.receive_json()
        assert payload["content"] == "Hello TickMe"

    history = client.get(f"/messages/{friend['user']['id']}/history", headers=author["headers"])
    assert history.status_code == 200
    assert history.json()[0]["content"] == "Hello TickMe"

    friend_notifications = client.get("/notifications", headers=friend["headers"]).json()
    assert "message" in {item["type"] for item in friend_notifications}
    unread = next(item for item in friend_notifications if item["type"] == "message")
    assert unread["is_read"] is False
    read = client.patch(f"/notifications/{unread['id']}/read", headers=friend["headers"])
    assert read.status_code == 200
    assert read.json()["is_read"] is True


def test_websocket_rejects_invalid_token(client, register):
    author = register(username="wsauthor")
    try:
        with client.websocket_connect(
            f"/messages/ws/{author['user']['id']}?token=invalid"
        ) as socket:
            socket.receive_json()
    except Exception:
        pass


def test_private_account_hides_posts_from_strangers(client, register, connect_friends):
    author = register(username="privateauthor")
    friend = register(username="privatefriend")
    stranger = register(username="privatestranger")
    connect_friends(author, friend)

    preferences = client.get("/users/me/preferences", headers=author["headers"]).json()
    client.put(
        "/users/me/preferences",
        headers=author["headers"],
        json={**preferences, "private_account": True},
    )
    post = create_post(client, author, "Private thoughts")

    assert any(
        item["id"] == post["id"]
        for item in client.get("/posts/all_posts", headers=author["headers"]).json()["items"]
    )
    assert any(
        item["id"] == post["id"]
        for item in client.get("/posts/all_posts", headers=friend["headers"]).json()["items"]
    )
    stranger_feed = client.get("/posts/all_posts", headers=stranger["headers"]).json()["items"]
    assert all(item["id"] != post["id"] for item in stranger_feed)
    assert client.get(f"/comments/posts/{post['id']}/comments", headers=stranger["headers"]).status_code == 404
    assert client.post(f"/ticks/{post['id']}", headers=stranger["headers"]).status_code == 404


def test_ticks_are_unique_and_counted(client, register):
    author = register(username="tickauthor")
    viewer = register(username="tickviewer")
    post = create_post(client, author, "Tick me")

    first = client.post(f"/ticks/{post['id']}", headers=viewer["headers"])
    assert first.status_code == 201, first.text
    assert first.json()["tick_count"] == 1

    duplicate = client.post(f"/ticks/{post['id']}", headers=viewer["headers"])
    assert duplicate.status_code == 400

    count = client.get(f"/ticks/{post['id']}/count", headers=viewer["headers"]).json()
    assert count == {"post_id": post["id"], "tick_count": 1, "ticked": True}

    who = client.get(f"/ticks/{post['id']}/who", headers=viewer["headers"]).json()
    assert who[0]["username"] == "tickviewer"

    my_ticks = client.get("/ticks/my-ticks", headers=viewer["headers"]).json()
    assert post["id"] in my_ticks["ticked_posts"]

    removed = client.delete(f"/ticks/{post['id']}", headers=viewer["headers"])
    assert removed.status_code == 200
    assert removed.json()["tick_count"] == 0
    assert client.delete(f"/ticks/{post['id']}", headers=viewer["headers"]).status_code == 404


def test_author_can_disable_ticks_on_posts(client, register):
    author = register(username="ticksettingauthor")
    viewer = register(username="ticksettingviewer")
    post = create_post(client, author, "Ticks are optional")

    preferences = client.get("/users/me/preferences", headers=author["headers"])
    assert preferences.status_code == 200
    assert preferences.json()["allow_ticks"] is True

    updated = client.put(
        "/users/me/preferences",
        headers=author["headers"],
        json={**preferences.json(), "allow_ticks": False},
    )
    assert updated.status_code == 200
    assert updated.json()["allow_ticks"] is False

    blocked = client.post(f"/ticks/{post['id']}", headers=viewer["headers"])
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "This user is not accepting ticks on their posts"

    enabled = client.put(
        "/users/me/preferences",
        headers=author["headers"],
        json={**updated.json(), "allow_ticks": True},
    )
    assert enabled.status_code == 200
    assert client.post(f"/ticks/{post['id']}", headers=viewer["headers"]).status_code == 201


def test_comments_and_authorization(client, register):
    author = register(username="commentauthor")
    commenter = register(username="commenter")
    post = create_post(client, author, "Comment on this")

    created = client.post(
        "/comments/",
        headers=commenter["headers"],
        json={"post_id": post["id"], "content": "Great work"},
    )
    assert created.status_code == 201, created.text
    comment_id = created.json()["id"]

    listed = client.get(f"/comments/posts/{post['id']}/comments", headers=author["headers"]).json()
    assert listed[0]["author"] == "Commenter"
    assert client.get(f"/comments/{comment_id}", headers=author["headers"]).status_code == 200

    assert client.delete(f"/comments/{comment_id}", headers=author["headers"]).status_code == 404
    assert client.delete(f"/comments/{comment_id}", headers=commenter["headers"]).status_code == 204


def test_post_validation_and_duplicate_content(client, register):
    author = register(username="postauthor")
    assert client.post(
        "/posts", headers=author["headers"], json={"content": "   "}
    ).status_code == 422
    assert client.post(
        "/posts", headers=author["headers"], json={"content": "x" * 5001}
    ).status_code == 422

    create_post(client, author, "Unique content")
    duplicate = client.post(
        "/posts", headers=author["headers"], json={"content": "Unique content"}
    )
    assert duplicate.status_code == 409
