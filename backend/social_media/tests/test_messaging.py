"""Real-time notification and presence tests."""


def test_notifications_stream_live_and_bulk_read(client, register):
    recipient = register(username="notifyrecipient")
    actor = register(username="notifyactor")

    with client.websocket_connect(
        f"/ws/{recipient['user']['id']}?token={recipient['token']}"
    ) as socket:
        followed = client.post(
            f"/users/{recipient['user']['id']}/follow", headers=actor["headers"]
        )
        assert followed.status_code in (200, 201), followed.text

        payload = socket.receive_json()
        assert payload["type"] == "follow"
        assert payload["recipient_id"] == recipient["user"]["id"]
        assert payload["is_read"] is False

    unread = client.get("/notifications/unread-count", headers=recipient["headers"])
    assert unread.status_code == 200
    assert unread.json() == {"count": 1}

    cleared = client.patch("/notifications/read-all", headers=recipient["headers"])
    assert cleared.status_code == 200
    assert cleared.json() == {"updated": 1}

    unread = client.get("/notifications/unread-count", headers=recipient["headers"])
    assert unread.json() == {"count": 0}


def test_conversations_expose_presence_and_avatar(client, register, connect_friends):
    author = register(username="presenceauthor")
    friend = register(username="presencefriend")
    connect_friends(author, friend)

    with client.websocket_connect(
        f"/messages/ws/{friend['user']['id']}?token={friend['token']}"
    ):
        conversations = client.get("/conversations", headers=author["headers"])
        assert conversations.status_code == 200
        match = next(
            item for item in conversations.json() if item["id"] == friend["user"]["id"]
        )
        assert match["online"] is True
        assert match["avatar_url"] == f"/users/{friend['user']['id']}/avatar"
        assert match["unread"] == 0


def test_conversation_unread_counts_and_ordering(client, register, connect_friends):
    author = register(username="unreadauthor")
    friend = register(username="unreadfriend")
    connect_friends(author, friend)

    with client.websocket_connect(
        f"/messages/ws/{friend['user']['id']}?token={friend['token']}"
    ) as socket:
        socket.send_json({"receiver_id": author["user"]["id"], "content": "First"})
        assert socket.receive_json()["content"] == "First"
        socket.send_json({"receiver_id": author["user"]["id"], "content": "Second"})
        assert socket.receive_json()["content"] == "Second"

    conversations = client.get("/conversations", headers=author["headers"]).json()
    match = next(item for item in conversations if item["id"] == friend["user"]["id"])
    assert match["unread"] == 2
    assert match["lastMessage"] == "Second"

    client.get(f"/messages/{friend['user']['id']}/history", headers=author["headers"])
    conversations = client.get("/conversations", headers=author["headers"]).json()
    match = next(item for item in conversations if item["id"] == friend["user"]["id"])
    assert match["unread"] == 0
