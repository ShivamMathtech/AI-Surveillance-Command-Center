import uuid, time, json, csv, io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from sqlalchemy import select, text, cast, String
from backend.app.schemas.domain import (
    Login,
    UserCreate,
    SensorInput,
    SimCommand,
    ZoneInput,
    ExperimentInput,
    AnnotationInput,
    Ingest,
    RuleConfig,
    UserUpdate,
    PasswordChange,
)
from backend.app.models.entities import (
    User,
    Sensor,
    CameraSource,
    Track,
    TrackPoint,
    Detection,
    Alert,
    Zone,
    Event,
    Experiment,
    Annotation,
    SystemMetric,
)
from backend.app.database.session import get_db, Session
from backend.app.core.security import current, permit, hasher, token, RateLimiter
from backend.app.core.config import DEMO_MODE
from backend.app.services.runtime import runtime, serialize
from ai.trackers.centroid import iso
from simulation.scenarios.catalog import SCENARIOS

router = APIRouter(prefix="/api")
logins = RateLimiter()


def audit(db, user, action, data=None):
    db.add(
        Event(
            id=str(uuid.uuid4()),
            timestamp=iso(time.time()),
            type="audit",
            data={"user": user["sub"], "action": action, **(data or {})},
        )
    )
    db.commit()


@router.post("/auth/login")
def login(body: Login, request: Request, db=Depends(get_db)):
    if not logins.allow(request.client.host, 10):
        raise HTTPException(429, "Too many login attempts")
    u = db.get(User, body.username)
    try:
        if not u or not u.enabled or not hasher.verify(u.password, body.password):
            raise ValueError()
    except Exception:
        raise HTTPException(401, "Invalid credentials")
    audit(db, {"sub": u.id}, "login")
    return {"access_token": token(u.id, u.role), "role": u.role, "username": u.id}


@router.post("/auth/demo")
def demo():
    if not DEMO_MODE or not runtime.demo_available or runtime.mode != "SIMULATED":
        raise HTTPException(403, "Demo disabled")
    return {"access_token": token("demo", "DEMO"), "role": "DEMO", "username": "demo"}


@router.get("/auth/me")
def me(user=Depends(current)):
    return user


@router.get("/users")
def users(user=Depends(permit("ADMIN")), db=Depends(get_db)):
    return [
        {"username": u.id, "role": u.role, "enabled": u.enabled}
        for u in db.scalars(select(User))
    ]


@router.post("/users", status_code=201)
def create_user(body: UserCreate, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    if db.get(User, body.username):
        raise HTTPException(409, "Username already exists")
    db.add(User(id=body.username, password=hasher.hash(body.password), role=body.role))
    audit(db, user, "create_user", {"username": body.username})
    return {"created": body.username}


@router.get("/live")
def live(user=Depends(current)):
    return runtime.snapshot()


@router.get("/sensors")
def sensors(user=Depends(current)):
    return runtime.sensors


@router.post("/sensors", status_code=201)
def add_sensor(body: SensorInput, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    sid = "sensor-" + uuid.uuid4().hex[:8]
    db.add(
        Sensor(
            id=sid,
            name=body.name,
            type=body.type,
            enabled=body.enabled,
            data={"position": {"x": 0, "y": 0}},
        )
    )
    db.flush()
    db.add(CameraSource(id=sid, protocol=body.protocol, endpoint=body.endpoint))
    audit(db, user, "add_sensor", {"id": sid})
    return {"id": sid}


@router.patch("/sensors/{sid}")
def edit_sensor(
    sid: str, body: SensorInput, user=Depends(permit("ADMIN")), db=Depends(get_db)
):
    s = db.get(Sensor, sid)
    if not s:
        raise HTTPException(404, "Sensor not found")
    s.name, s.type, s.enabled = body.name, body.type, body.enabled
    db.merge(CameraSource(id=sid, protocol=body.protocol, endpoint=body.endpoint))
    audit(db, user, "edit_sensor", {"id": sid})
    return {"id": sid}


@router.get("/sensors/{sid}/config")
def sensor_config(sid: str, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    s = db.get(Sensor, sid)
    c = db.get(CameraSource, sid)
    if not s:
        raise HTTPException(404, "Sensor not found")
    return dict(
        name=s.name,
        type=s.type,
        enabled=s.enabled,
        protocol=c.protocol if c else "mock",
        endpoint=c.endpoint if c else "",
    )


@router.post("/sensors/{sid}/test")
async def test_sensor(sid: str, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    s = db.get(Sensor, sid)
    c = db.get(CameraSource, sid)
    if not s:
        raise HTTPException(404, "Sensor not found")
    if not c or c.protocol == "mock":
        return {"status": "SIMULATED", "message": "Mock adapter ready"}
    if c.protocol == "webrtc":
        return {
            "status": "UNAVAILABLE",
            "message": "Camera-specific signaling adapter required",
        }
    import asyncio
    from backend.app.services.video import FileVideoSource, RTSPVideoSource

    def test():
        source = None
        try:
            source = (FileVideoSource if c.protocol == "file" else RTSPVideoSource)(
                c.endpoint
            )
            return {
                "status": "CONNECTED" if source.read() is not None else "DISCONNECTED"
            }
        except Exception:
            return {
                "status": "DISCONNECTED",
                "message": "Check allowlist, file path and camera endpoint",
            }
        finally:
            if source:
                source.close()

    return await asyncio.to_thread(test)


@router.get("/video/{sid}/frame")
def frame(sid: str, user=Depends(current)):
    if sid not in runtime.frame_jpegs:
        raise HTTPException(503, "Camera disconnected")
    return Response(
        runtime.frame_jpegs[sid],
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/tracks")
def tracks(
    q: str = "",
    class_name: str = "",
    status: str = "",
    sensor: str = "",
    confidence: float = Query(0, ge=0, le=1),
    since: str = "",
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user=Depends(current),
    db=Depends(get_db),
):
    query = select(Track).order_by(Track.last_seen.desc())
    if q:
        query = query.where(Track.id.contains(q))
    if class_name:
        query = query.where(Track.class_name == class_name)
    if status:
        query = query.where(Track.status == status)
    if since:
        query = query.where(Track.last_seen >= since)
    query = query.where(Track.data["confidence"].as_float() >= confidence)
    if sensor:
        query = query.where(
            cast(Track.data["sensor_sources"], String).contains('"' + sensor + '"')
        )
    rows = db.scalars(query.offset(offset).limit(limit))
    return [t.data for t in rows]


@router.get("/tracks/{tid}")
def track(tid: str, user=Depends(current), db=Depends(get_db)):
    t = db.get(Track, tid)
    if not t:
        raise HTTPException(404, "Track not found")
    return dict(
        **t.data,
        events=[
            serialize(e)
            for e in db.scalars(
                select(Event)
                .where(Event.track_id == tid)
                .order_by(Event.timestamp.desc())
                .limit(100)
            )
        ],
        detection_history=[
            d.data
            for d in db.scalars(
                select(Detection)
                .where(Detection.track_id == tid)
                .order_by(Detection.timestamp.desc())
                .limit(200)
            )
        ]
    )


@router.get("/detections")
def detections(
    limit: int = Query(100, ge=1, le=1000), user=Depends(current), db=Depends(get_db)
):
    return [
        d.data
        for d in db.scalars(
            select(Detection).order_by(Detection.timestamp.desc()).limit(limit)
        )
    ]


@router.post("/detections/ingest")
def ingest(body: Ingest, user=Depends(permit("ADMIN", "OPERATOR")), db=Depends(get_db)):
    if runtime.mode != "REAL":
        raise HTTPException(409, "Switch to REAL mode before ingestion")
    known = {s.id for s in db.scalars(select(Sensor))}
    values = [d.model_dump() for d in body.detections]
    if any(d["sensor_id"] not in known for d in values):
        raise HTTPException(422, "Unknown sensor")
    if any(abs(d["timestamp"] - time.time()) > 5 for d in values):
        raise HTTPException(422, "Measurements must be within 5 seconds of server time")
    runtime.process(values, time.time())
    return {"accepted": len(values)}


@router.get("/alerts")
def alerts(user=Depends(current)):
    return runtime.alerts


@router.post("/alerts/{aid}/{action}")
def alert_action(
    aid: str,
    action: str,
    user=Depends(permit("ADMIN", "OPERATOR", "DEMO")),
    db=Depends(get_db),
):
    if user["role"] == "DEMO" and runtime.mode != "SIMULATED":
        raise HTTPException(403, "Demo actions only in simulation")
    a = db.get(Alert, aid)
    if not a:
        raise HTTPException(404, "Alert not found")
    if action == "acknowledge":
        a.acknowledged = True
    elif action == "mute":
        a.muted = True
    elif action != "investigate":
        raise HTTPException(404, "Unknown action")
    for item in runtime.alerts:
        if item["id"] == aid:
            item.update(acknowledged=a.acknowledged, muted=a.muted)
    audit(db, user, action, {"alert_id": aid})
    return serialize(a)


@router.get("/zones")
def zones(user=Depends(current)):
    return runtime.zones


@router.post("/zones")
def add_zone(body: ZoneInput, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    zid = "zone-" + uuid.uuid4().hex[:8]
    db.add(Zone(id=zid, name=body.name, data=body.model_dump(exclude={"name"})))
    audit(db, user, "add_zone")
    runtime.load()
    return {"id": zid}


@router.get("/analytics")
def analytics(
    minutes: int = Query(15, ge=1, le=10080),
    user=Depends(permit("ADMIN", "OPERATOR", "ANALYST", "DEMO")),
    db=Depends(get_db),
):
    threshold = iso(time.time() - minutes * 60)
    rows = list(
        db.scalars(
            select(SystemMetric)
            .where(SystemMetric.timestamp >= threshold)
            .order_by(SystemMetric.timestamp.desc())
            .limit(10000)
        )
    )
    step = max(1, len(rows) // 300)
    return dict(
        runtime.analytics(),
        history=[
            {
                "time": r.timestamp,
                "tracks": r.data["active_tracks"],
                "detections": r.data["detections"],
                "confidence": r.data["confidence"] * 100,
                "latency": r.data["latency"],
                "alerts": r.data["alerts"],
            }
            for r in reversed(rows[::step])
        ],
    )


@router.get("/system/health")
def system(user=Depends(current)):
    return runtime.system()


@router.get("/simulation/status")
def sim_status(user=Depends(current)):
    return dict(runtime.status(), scenarios=SCENARIOS)


@router.post("/simulation/{action}")
def sim_action(
    action: str,
    body: SimCommand,
    user=Depends(permit("ADMIN", "OPERATOR", "DEMO")),
    db=Depends(get_db),
):
    if runtime.mode != "SIMULATED":
        raise HTTPException(409, "Simulation is not active")
    if action == "start":
        if runtime.scene.scenario != body.scenario:
            runtime.reset()
        runtime.scene.scenario = body.scenario
        runtime.scene.speed = body.speed
        runtime.scene.running = True
    elif action == "stop":
        runtime.scene.running = False
    elif action == "reset":
        runtime.reset()
    else:
        raise HTTPException(404, "Unknown simulation action")
    audit(db, user, "simulation_" + action)
    return runtime.status()


@router.post("/mode/{mode}")
def change_mode(mode: str, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    if mode not in ["REAL", "SIMULATED"]:
        raise HTTPException(422, "Invalid mode")
    if mode == "REAL":
        from backend.app.models.entities import Scenario

        db.merge(Scenario(id="real-mode-used", data={"enabled": True}))
        db.commit()
        runtime.demo_available = False
    runtime.mode = mode
    runtime.reset()
    runtime.scene.running = mode == "SIMULATED"
    runtime.frame_jpegs.clear()
    audit(db, user, "mode_" + mode)
    return runtime.status()


@router.get("/playback")
def playback(at: datetime, user=Depends(current), db=Depends(get_db)):
    at = (
        at.replace(tzinfo=timezone.utc)
        if at.tzinfo is None
        else at.astimezone(timezone.utc)
    )
    lo = (at - timedelta(seconds=2)).isoformat()
    hi = at.isoformat()
    ds = [
        d.data
        for d in db.scalars(
            select(Detection)
            .where(Detection.timestamp >= lo, Detection.timestamp <= hi)
            .order_by(Detection.timestamp.desc())
            .limit(1000)
        )
    ]
    tracks = {}
    for d in ds:
        if d.get("track_id") and d["track_id"] not in tracks:
            t = db.get(Track, d["track_id"])
            if t:
                points = [
                    {"x": p.x, "y": p.y, "timestamp": p.timestamp}
                    for p in db.scalars(
                        select(TrackPoint)
                        .where(TrackPoint.track_id == t.id, TrackPoint.timestamp <= hi)
                        .order_by(TrackPoint.timestamp.desc())
                        .limit(180)
                    )
                ]
                tracks[t.id] = dict(
                    t.data,
                    position=d.get("position"),
                    bbox=d["bbox"],
                    last_seen=iso(d["timestamp"]),
                    trajectory=list(reversed(points)),
                    status="HISTORICAL",
                )
    return {
        "tracks": list(tracks.values()),
        "detections": ds,
        "timestamp": hi,
        "notice": "Detection/trajectory playback; raw video is not retained",
    }


@router.get("/events")
def events(user=Depends(current), db=Depends(get_db)):
    return [
        serialize(e)
        for e in db.scalars(select(Event).order_by(Event.timestamp.desc()).limit(200))
    ]


@router.get("/research/experiments")
def experiments(user=Depends(permit("ADMIN", "ANALYST", "DEMO")), db=Depends(get_db)):
    return [
        serialize(e)
        for e in db.scalars(
            select(Experiment).order_by(Experiment.timestamp.desc()).limit(100)
        )
    ]


@router.post("/research/experiments")
def experiment(
    body: ExperimentInput,
    user=Depends(permit("ADMIN", "ANALYST", "DEMO")),
    db=Depends(get_db),
):
    if user["role"] == "DEMO" and runtime.mode != "SIMULATED":
        raise HTTPException(403, "Simulation only")
    e = Experiment(
        id="EXP-" + uuid.uuid4().hex[:8],
        timestamp=iso(time.time()),
        data=dict(
            **body.model_dump(),
            sensor_configuration=runtime.sensors,
            results=runtime.analytics(),
            provenance=runtime.mode
        ),
    )
    db.add(e)
    audit(db, user, "experiment")
    return serialize(e)


@router.post("/research/annotations")
def annotate(
    body: AnnotationInput,
    user=Depends(permit("ADMIN", "ANALYST", "DEMO")),
    db=Depends(get_db),
):
    if user["role"] == "DEMO" and runtime.mode != "SIMULATED":
        raise HTTPException(403, "Simulation only")
    a = Annotation(
        id=str(uuid.uuid4()), timestamp=iso(time.time()), data=body.model_dump()
    )
    db.add(a)
    audit(db, user, "annotation")
    return serialize(a)


@router.get("/research/export")
def export(
    format: str = "json",
    user=Depends(permit("ADMIN", "ANALYST", "DEMO")),
    db=Depends(get_db),
):
    experiments = [serialize(e) for e in db.scalars(select(Experiment).limit(1000))]
    annotations = [serialize(a) for a in db.scalars(select(Annotation).limit(10000))]
    if format == "json":
        return {"experiments": experiments, "annotations": annotations}
    if format != "csv":
        raise HTTPException(422, "Use csv or json")
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        [
            "id",
            "timestamp",
            "model_version",
            "dataset",
            "provenance",
            "active_tracks",
            "confidence",
        ]
    )
    for e in experiments:
        d = e["data"]
        writer.writerow(
            [
                e["id"],
                e["timestamp"],
                d["model_version"],
                d["dataset"],
                d["provenance"],
                d["results"]["active_tracks"],
                d["results"]["confidence"],
            ]
        )
    return Response(
        out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=experiments.csv"},
    )


@router.get("/rules")
def rules(user=Depends(current)):
    return {
        "unknown_seconds": runtime.rules.unknown_seconds,
        "latency_ms": runtime.rules.latency_ms,
    }


@router.put("/rules")
def update_rules(body: RuleConfig, user=Depends(permit("ADMIN")), db=Depends(get_db)):
    from backend.app.models.entities import Scenario

    db.merge(Scenario(id="alert-rules", data=body.model_dump()))
    audit(db, user, "update_rules")
    runtime.rules.unknown_seconds = body.unknown_seconds
    runtime.rules.latency_ms = body.latency_ms
    return body


@router.patch("/users/{username}")
def update_user(
    username: str, body: UserUpdate, user=Depends(permit("ADMIN")), db=Depends(get_db)
):
    u = db.get(User, username)
    if not u:
        raise HTTPException(404, "User not found")
    if username == user["sub"] and (not body.enabled or body.role != "ADMIN"):
        raise HTTPException(
            409, "Cannot disable or demote your own administrator account"
        )
    u.role, u.enabled = body.role, body.enabled
    audit(db, user, "update_user", {"username": username})
    return {"updated": username}


@router.post("/auth/password")
def change_password(body: PasswordChange, user=Depends(current), db=Depends(get_db)):
    if user["role"] == "DEMO":
        raise HTTPException(403, "Demo has no password")
    u = db.get(User, user["sub"])
    try:
        hasher.verify(u.password, body.current_password)
    except Exception:
        raise HTTPException(401, "Current password does not match")
    u.password = hasher.hash(body.new_password)
    audit(db, user, "change_password")
    return {"changed": True}
