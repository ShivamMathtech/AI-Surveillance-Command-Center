import time
from backend.app.database.session import Session
from backend.app.models.entities import Track, Detection, Alert
from sqlalchemy import select


def test_auth_and_demo_boundary(client, demo):
    assert client.get("/api/tracks").status_code == 401
    assert client.get("/api/live", headers=demo).status_code == 200
    assert (
        client.post(
            "/api/sensors", headers=demo, json={"name": "Test", "type": "EO"}
        ).status_code
        == 403
    )
    assert client.post("/api/mode/REAL", headers=demo).status_code == 403
    assert (
        client.post(
            "/api/auth/login", json={"username": "admin", "password": "wrong"}
        ).status_code
        == 401
    )


def test_seed_persistence_and_track_details(client, demo):
    state = client.get("/api/live", headers=demo).json()
    assert len(state["tracks"]) >= 10 and len(state["sensors"]) >= 5
    with Session() as db:
        assert db.scalar(select(Track)) is not None
        assert db.scalar(select(Detection)) is not None
    detail = client.get("/api/tracks/" + state["tracks"][0]["id"], headers=demo)
    assert detail.status_code == 200 and "detection_history" in detail.json()


def test_alert_ack_and_muting(client, demo):
    alerts = client.get("/api/alerts", headers=demo).json()
    assert alerts
    aid = alerts[0]["id"]
    assert client.post("/api/alerts/" + aid + "/acknowledge", headers=demo).json()[
        "acknowledged"
    ]
    assert client.post("/api/alerts/" + aid + "/mute", headers=demo).json()["muted"]
    with Session() as db:
        assert db.get(Alert, aid).acknowledged


def test_sim_controls_and_validation(client, demo):
    assert (
        client.post(
            "/api/simulation/start",
            headers=demo,
            json={"scenario": "dense", "speed": 5},
        ).status_code
        == 200
    )
    assert (
        client.post("/api/simulation/stop", headers=demo, json={}).json()["running"]
        is False
    )
    assert (
        client.post(
            "/api/simulation/start", headers=demo, json={"speed": 20}
        ).status_code
        == 422
    )
    assert (
        client.post("/api/simulation/reset", headers=demo, json={}).status_code == 200
    )
    client.post(
        "/api/simulation/start", headers=demo, json={"scenario": "normal", "speed": 1}
    )


def test_websocket_snapshot_and_reconnect(client, demo):
    token = demo["Authorization"].split()[1]
    for _ in range(2):
        with client.websocket_connect("/ws/live") as ws:
            ws.send_json({"token": token})
            message = ws.receive_json()
            assert message["type"] == "snapshot" and "sensors" in message["data"]
            state = ws.receive_json()
            assert state["sequence"] >= message["sequence"]


def test_users_and_sensor_configuration(client, admin):
    sensor = client.post(
        "/api/sensors",
        headers=admin,
        json={
            "name": "Research camera",
            "type": "EO",
            "enabled": True,
            "protocol": "mock",
        },
    ).json()["id"]
    assert (
        client.get("/api/sensors/" + sensor + "/config", headers=admin).json()["name"]
        == "Research camera"
    )
    assert (
        client.post("/api/sensors/" + sensor + "/test", headers=admin).json()["status"]
        == "SIMULATED"
    )
    assert (
        client.post(
            "/api/users",
            headers=admin,
            json={
                "username": "viewer-test",
                "password": "test-password-long-123",
                "role": "VIEWER",
            },
        ).status_code
        == 201
    )
    login = client.post(
        "/api/auth/login",
        json={"username": "viewer-test", "password": "test-password-long-123"},
    ).json()
    headers = {"Authorization": "Bearer " + login["access_token"]}
    assert client.get("/api/tracks", headers=headers).status_code == 200
    assert client.get("/api/analytics", headers=headers).status_code == 403
    assert (
        client.post("/api/simulation/start", headers=headers, json={}).status_code
        == 403
    )


def test_research_export_and_annotation(client, demo):
    result = client.post(
        "/api/research/experiments",
        headers=demo,
        json={
            "model_version": "test-v1",
            "dataset": "synthetic",
            "parameters": {"seed": 42},
        },
    )
    assert result.status_code == 200
    assert (
        client.post(
            "/api/research/annotations",
            headers=demo,
            json={"kind": "missed_detection", "note": "Review frame"},
        ).status_code
        == 200
    )
    assert "test-v1" in client.get("/api/research/export?format=csv", headers=demo).text
    exported = client.get("/api/research/export", headers=demo).json()
    assert exported["experiments"] and exported["annotations"]


def test_health_metrics_and_playback(client, demo):
    assert client.get("/health").status_code == 200
    assert client.get("/ready").status_code == 200
    assert "scc_detections_total" in client.get("/metrics").text
    at = client.get("/api/live", headers=demo).json()["timestamp"]
    result = client.get("/api/playback", params={"at": at}, headers=demo)
    assert result.status_code == 200 and "tracks" in result.json()


def test_real_ingest_validation(client, admin, demo):
    client.post("/api/mode/REAL", headers=admin)
    from tests.test_pipeline import detection

    d = detection(stamp=time.time())
    d["provenance"] = "REAL"
    assert (
        client.post(
            "/api/detections/ingest", headers=admin, json={"detections": [d]}
        ).json()["accepted"]
        == 1
    )
    d["sensor_id"] = "absent"
    assert (
        client.post(
            "/api/detections/ingest", headers=admin, json={"detections": [d]}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/research/annotations", headers=demo, json={"kind": "false_positive"}
        ).status_code
        == 403
    )
    client.post("/api/mode/SIMULATED", headers=admin)
    assert client.post("/api/auth/demo").status_code == 403
    assert client.get("/api/tracks", headers=demo).status_code == 403
