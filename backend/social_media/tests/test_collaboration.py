"""Build Together collaboration tests."""

from tests.test_projects import create_project


def send_request(client, user, project_id, **payload):
    response = client.post(
        f"/projects/{project_id}/collaboration-requests",
        headers=user["headers"],
        json={"message": "I can help with the frontend.", "role": "Frontend", **payload},
    )
    return response


def test_collaboration_request_flow(client, register):
    owner = register(username="collabowner")
    builder = register(username="collabbuilder")
    project = create_project(client, owner)

    sent = send_request(client, builder, project["id"])
    assert sent.status_code == 201, sent.text

    received = client.get(
        "/collaboration-requests/received", headers=owner["headers"]
    ).json()
    assert len(received) == 1
    assert received[0]["user"]["username"] == "collabbuilder"
    assert received[0]["project"]["id"] == project["id"]

    outgoing = client.get(
        "/collaboration-requests/sent", headers=builder["headers"]
    ).json()
    assert len(outgoing) == 1
    assert outgoing[0]["status"] == "pending"

    detail = client.get(f"/projects/{project['id']}", headers=builder["headers"]).json()
    assert detail["collaboration_status"] == "pending"
    assert detail["collaborator_count"] == 0

    accepted = client.patch(
        f"/projects/{project['id']}/collaboration-requests/{received[0]['id']}/accept",
        headers=owner["headers"],
    )
    assert accepted.status_code == 200, accepted.text

    detail = client.get(f"/projects/{project['id']}", headers=builder["headers"]).json()
    assert detail["collaboration_status"] == "accepted"
    assert detail["collaborator_count"] == 1
    assert [member["username"] for member in detail["collaborators"]] == ["collabbuilder"]

    updated_owner = client.get(
        f"/projects/{project['id']}", headers=owner["headers"]
    ).json()
    assert updated_owner["collaboration_status"] == "owner"
    assert updated_owner["collaborator_count"] == 1

    assert client.get(
        "/collaboration-requests/sent", headers=builder["headers"]
    ).json() == []

    assert client.get(
        f"/projects/{project['id']}/collaboration-requests",
        headers=owner["headers"],
    ).json() == []

    notifications = client.get("/notifications", headers=builder["headers"]).json()
    kinds = {item["type"] for item in notifications}
    assert "collaboration_accepted" in kinds

    collaborators = client.get(
        f"/projects/{project['id']}/collaborators", headers=builder["headers"]
    ).json()
    assert [item["username"] for item in collaborators] == ["collabbuilder"]


def test_collaboration_request_guards(client, register):
    owner = register(username="collabguards")
    builder = register(username="collabguardsbuilder")
    project = create_project(client, owner)

    assert send_request(client, owner, project["id"]).status_code == 400
    assert send_request(client, builder, project["id"]).status_code == 201
    assert send_request(client, builder, project["id"]).status_code == 409

    closed = create_project(
        client, owner, title="Closed Project", looking_for_collaborators=False
    )
    assert send_request(client, builder, closed["id"]).status_code == 400
    assert send_request(client, builder, 9999).status_code == 404


def test_only_owner_can_accept_or_reject(client, register):
    owner = register(username="collabreviewer")
    builder = register(username="collabreviewed")
    stranger = register(username="collabstranger")
    project = create_project(client, owner)
    send_request(client, builder, project["id"])

    received = client.get(
        "/collaboration-requests/received", headers=owner["headers"]
    ).json()
    request_id = received[0]["id"]

    assert client.patch(
        f"/projects/{project['id']}/collaboration-requests/{request_id}/accept",
        headers=stranger["headers"],
    ).status_code == 403
    assert client.patch(
        f"/projects/{project['id']}/collaboration-requests/{request_id}/reject",
        headers=builder["headers"],
    ).status_code == 403

    rejected = client.patch(
        f"/projects/{project['id']}/collaboration-requests/{request_id}/reject",
        headers=owner["headers"],
    )
    assert rejected.status_code == 200
    assert client.get(
        "/collaboration-requests/received", headers=owner["headers"]
    ).json() == []

    resent = send_request(client, builder, project["id"], message="Updated pitch")
    assert resent.status_code == 201, resent.text
    assert client.get(
        "/collaboration-requests/received", headers=owner["headers"]
    ).json()[0]["message"] == "Updated pitch"


def test_cancel_request_and_remove_collaborator(client, register):
    owner = register(username="collabremove")
    builder = register(username="collabremoved")
    project = create_project(client, owner)

    send_request(client, builder, project["id"])
    request_id = client.get(
        "/collaboration-requests/sent", headers=builder["headers"]
    ).json()[0]["id"]

    cancelled = client.delete(
        f"/projects/{project['id']}/collaboration-requests/{request_id}",
        headers=builder["headers"],
    )
    assert cancelled.status_code == 204

    assert send_request(client, builder, project["id"]).status_code == 201
    request_id = client.get(
        "/collaboration-requests/sent", headers=builder["headers"]
    ).json()[0]["id"]
    accepted = client.patch(
        f"/projects/{project['id']}/collaboration-requests/{request_id}/accept",
        headers=owner["headers"],
    )
    assert accepted.status_code == 200

    assert client.delete(
        f"/projects/{project['id']}/collaborators/{builder['user']['id']}",
        headers=owner["headers"],
    ).status_code == 204
    assert client.get(
        f"/projects/{project['id']}/collaborators", headers=owner["headers"]
    ).json() == []
    assert client.get(
        f"/projects/{project['id']}", headers=builder["headers"]
    ).json()["collaboration_status"] == "none"


def test_collaboration_requires_authentication(client, register):
    owner = register(username="collabauth")
    project = create_project(client, owner)
    assert client.get("/collaboration-requests/received").status_code == 401
    assert client.post(
        f"/projects/{project['id']}/collaboration-requests", json={}
    ).status_code == 401
