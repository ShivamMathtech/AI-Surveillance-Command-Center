import math
from ai.trackers.centroid import CentroidTracker
from ai.fusion.engine import SpatialFusion
from ai.fusion.coordinates import CoordinateService
from backend.app.services.alerts import AlertRules
from simulation.generators.scene import Scene
from simulation.scenarios.catalog import SCENARIOS


def detection(x=0, sensor="eo-01", stamp=100):
    return dict(
        detection_id=f"{sensor}-{stamp}",
        class_name="Person",
        confidence=0.9,
        bbox=[0.1, 0.2, 0.1, 0.2],
        timestamp=stamp,
        sensor_id=sensor,
        position={"x": x, "y": 0, "z": 0},
        provenance="SIMULATED",
    )


def test_tracking_lifecycle():
    tracker = CentroidTracker()
    first = tracker.update([detection()], 100)[0]
    assert first["status"] == "NEW"
    second = tracker.update([detection(1, stamp=101)], 101)[0]
    assert second["id"] == first["id"] and second["status"] == "ACTIVE"
    assert tracker.update([], 104)[0]["status"] == "LOST"
    reacquired = tracker.update([detection(4, stamp=105)], 105)[0]
    assert reacquired["status"] == "REACQUIRED" and reacquired["id"] == first["id"]
    assert tracker.update([], 120)[0]["status"] == "ENDED"


def test_fusion_gates_and_confidence():
    engine = SpatialFusion()
    fused = engine.fuse([detection(), detection(1, "ir-01")])
    assert len(fused) == 1 and len(fused[0]["sensor_sources"]) == 2
    assert math.isclose(fused[0]["position"]["x"], 0.5)
    assert len(engine.fuse([detection(), detection(1, "ir-01", 102)])) == 2
    assert len(engine.fuse([detection(), detection(20, "ir-01")])) == 2
    assert len(engine.fuse([detection(), detection(1)])) == 2


def test_uncalibrated_never_gets_world_position():
    d = detection()
    d["position"] = None
    t = CentroidTracker().update([d], 100)[0]
    assert t["coordinate_space"] == "IMAGE" and t["position"] is None


def test_coordinates_roundtrip_and_rotation():
    c = CoordinateService()
    world = c.local_to_world(120, 60, 15)
    local = c.world_to_local(**world)
    assert abs(local["x"] - 120) < 1e-6 and abs(local["y"] - 60) < 1e-6
    assert abs(c.sensor_to_local([10, 0, 0], [0, 0, 0], 90)["y"] - 10) < 1e-6


def test_zone_entry_exit_and_offline_alerts():
    rule = AlertRules([{"id": "z", "name": "Zone", "x": 0, "y": 0, "radius": 10}])
    tracker = CentroidTracker(gate=100)
    tracks = tracker.update([detection()], 100)
    assert any(a["type"] == "zone_entry" for a in rule.evaluate(tracks, [], 100))
    assert not rule.evaluate(tracks, [], 101)
    tracks = tracker.update([detection(20, stamp=120)], 120)
    assert any(a["type"] == "zone_exit" for a in rule.evaluate(tracks, [], 120))
    assert any(
        a["type"] == "sensor_offline"
        for a in rule.evaluate(
            [], [{"id": "ir", "name": "IR", "status": "OFFLINE", "latency": 0}], 121
        )
    )


def test_all_scenarios_have_valid_observations():
    from backend.app.schemas.domain import Observation

    scene = Scene()
    for s in SCENARIOS:
        scene.scenario = s["id"]
        rows = scene.read(100)
        assert len(rows) >= 10
        for d in rows:
            Observation(**d)
    scene.scenario = "failure"
    scene.time = 15
    assert all(d["sensor_id"] != "ir-01" for d in scene.read(100))


def test_tracking_unique_association():
    tracker = CentroidTracker()
    tracks = tracker.update([detection(0), detection(10, "ir-01")], 100)
    assert len({t["id"] for t in tracks}) == 2
    tracks = tracker.update([detection(1, stamp=101), detection(11, "ir-01", 101)], 101)
    assert len(tracks) == 2
