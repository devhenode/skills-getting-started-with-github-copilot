from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app


@pytest.fixture(autouse=True)
def reset_activities():
    """Ensure mutations to the in-memory store do not leak between tests."""
    original_state = deepcopy(activities)
    try:
        yield
    finally:
        activities.clear()
        activities.update(deepcopy(original_state))


def create_client():
    return TestClient(app)


def test_get_activities_lists_all_entries():
    client = create_client()

    response = client.get("/activities")

    assert response.status_code == 200
    payload = response.json()
    # Basic shape checks to ensure the API remains compatible with the UI expectations.
    assert isinstance(payload, dict)
    assert "Chess Club" in payload
    assert "participants" in payload["Chess Club"]


def test_signup_adds_new_participant():
    client = create_client()
    email = "new.student@mergington.edu"

    response = client.post("/activities/Chess%20Club/signup", params={"email": email})

    assert response.status_code == 200
    message = response.json()["message"]
    assert email in message
    assert "Chess Club" in message
    assert email in activities["Chess Club"]["participants"]


@pytest.mark.parametrize("email", ["michael@mergington.edu", "daniel@mergington.edu"])
def test_signup_rejects_duplicate_registration(email):
    client = create_client()

    response = client.post("/activities/Chess%20Club/signup", params={"email": email})

    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for an activity"


def test_remove_participant_success():
    client = create_client()
    email = activities["Programming Class"]["participants"][0]

    response = client.delete("/activities/Programming%20Class/signup", params={"email": email})

    assert response.status_code == 200
    assert email not in activities["Programming Class"]["participants"]


def test_remove_participant_missing_activity():
    client = create_client()

    response = client.delete("/activities/Nonexistent/signup", params={"email": "student@mergington.edu"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_participant_missing_participant():
    client = create_client()

    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "not.signedup@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found in this activity"
