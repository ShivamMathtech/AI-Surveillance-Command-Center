import asyncio, time, math, logging, uuid
from collections import deque
from datetime import datetime, timezone, timedelta
import psutil
from sqlalchemy import select
from backend.app.core.config import DEMO_MODE, REDIS_URL
from backend.app.database.session import Session
from backend.app.models.entities import Sensor, Zone, Alert, Track, CameraSource
from backend.app.services.alerts import AlertRules
from backend.app.services.repository import StateRepository, AlertRepository
from backend.app.websocket.hub import Hub
from ai.detectors.mock import MockDetector
from ai.trackers.centroid import CentroidTracker, iso
from ai.fusion.engine import SpatialFusion
from simulation.generators.scene import Scene
from prometheus_client import Gauge, Histogram, Counter

WS_CLIENTS = Gauge("scc_websocket_clients", "Connected clients")
PIPELINE_TIME = Histogram(
    "scc_pipeline_seconds", "Detection fusion tracking pipeline duration"
)
DETECTIONS = Counter("scc_detections_total", "Processed detections")


class Runtime:
    def __init__(self):
        self.scene = Scene()
        self.scene.running = DEMO_MODE
        self.tracker = CentroidTracker(prefix="T-" + uuid.uuid4().hex[:4])
        self.detector = MockDetector()
        self.fusion = SpatialFusion()
        self.repository = StateRepository()
        self.hub = Hub()
        self.tracks = []
        self.detections = []
        self.sensors = []
        self.alerts = []
        self.history = deque(maxlen=420)
        self.zones = []
        self.demo_available = DEMO_MODE
        self.mode = "SIMULATED" if DEMO_MODE else "REAL"
        self.inference_ms = 0.0
        self.tracking_ms = 0.0
        self.total_detections = 0
        self.started = time.time()
        self.last_persist = 0.0
        self.last_prune = 0.0
        self.frame_jpegs = {}
        self.real_health = {}
        self.running = True
        self.redis = None
        self.redis_ok = False
        self.db_ok = True

    def load(self):
        with Session() as db:
            self.zones = [
                dict(id=z.id, name=z.name, **z.data) for z in db.scalars(select(Zone))
            ]
            self.alerts = [serialize(a) for a in AlertRepository.recent(db)]
        self.rules = AlertRules(self.zones)
        with Session() as db:
            from backend.app.models.entities import Scenario

            if db.get(Scenario, "real-mode-used"):
                self.demo_available = False
            config = db.get(Scenario, "alert-rules")
            if config:
                self.rules.unknown_seconds = config.data["unknown_seconds"]
                self.rules.latency_ms = config.data["latency_ms"]

    async def bootstrap_history(self):
        with Session() as db:
            if db.scalar(select(Track.id).limit(1)) or self.mode != "SIMULATED":
                return
        for i in range(20):
            now = time.time() - 20 + i
            self.scene.time = float(i)
            self.process(self.scene.read(now), now)
            new_alerts = self.rules.evaluate(self.tracks, [], now)
            self.alerts = (new_alerts + self.alerts)[:500]
            metrics = self.analytics()
            self.history.append(
                {
                    "time": iso(now),
                    "tracks": metrics["active_tracks"],
                    "detections": len(self.detections),
                    "confidence": metrics["confidence"] * 100,
                    "latency": 0,
                    "alerts": metrics["alerts"],
                }
            )
            await asyncio.to_thread(
                self.repository.persist,
                self.tracks,
                self.detections,
                [],
                new_alerts,
                {k: v for k, v in metrics.items() if k != "history"},
                iso(now),
            )

    def analytics(self):
        live = [t for t in self.tracks if t["status"] not in ["LOST", "ENDED"]]
        return {
            "detections": self.total_detections,
            "active_tracks": len(live),
            "confidence": sum(t["confidence"] for t in live) / max(1, len(live)),
            "continuity": len(live)
            / max(1, len([t for t in self.tracks if t["status"] != "ENDED"])),
            "latency": sum(s["latency"] for s in self.sensors)
            / max(1, len(self.sensors)),
            "sensor_uptime": sum(s["status"] == "ONLINE" for s in self.sensors)
            / max(1, len(self.sensors)),
            "inference_ms": self.inference_ms,
            "tracking_ms": self.tracking_ms,
            "inference_fps": (
                1000 / max(1, self.inference_ms) if self.mode == "REAL" else None
            ),
            "dropped_frames": None,
            "association_accuracy": None,
            "sensor_disagreement": max([t.get("disagreement", 0) for t in live] + [0]),
            "distribution": {
                c: sum(t["class_name"] == c for t in live)
                for c in ["Person", "Vehicle", "Animal", "Unknown"]
            },
            "alerts": len([a for a in self.alerts if not a["acknowledged"]]),
            "history": list(self.history),
            "provenance": self.mode,
        }

    def status(self):
        return {
            "running": self.scene.running,
            "scenario": self.scene.scenario,
            "speed": self.scene.speed,
            "elapsed": round(self.scene.time, 1),
            "mode": self.mode,
        }

    def system(self):
        return {
            "cpu": psutil.cpu_percent(),
            "memory": psutil.virtual_memory().percent,
            "gpu": None,
            "uptime": round(time.time() - self.started),
            "websocket_clients": len(self.hub.clients),
            "database": self.db_ok,
            "redis": self.redis_ok,
            "network_bytes": psutil.net_io_counters().bytes_sent
            + psutil.net_io_counters().bytes_recv,
        }

    def snapshot(self):
        return {
            "tracks": self.tracks,
            "detections": self.detections[-150:],
            "sensors": self.sensors,
            "alerts": self.alerts[:100],
            "zones": self.zones,
            "analytics": self.analytics(),
            "simulation": self.status(),
            "system": self.system(),
            "timestamp": iso(time.time()),
        }

    def process(self, observations, now):
        start = time.perf_counter()
        fused = self.fusion.fuse(observations)
        mid = time.perf_counter()
        self.tracks = self.tracker.update(fused, now)
        self.tracking_ms = (time.perf_counter() - mid) * 1000
        mapping = {d: t["id"] for t in self.tracks for d in t.get("detection_ids", [])}
        self.detections = [
            dict(d, track_id=mapping.get(d["detection_id"])) for d in observations
        ]
        self.total_detections += len(observations)
        DETECTIONS.inc(len(observations))
        PIPELINE_TIME.observe(time.perf_counter() - start)

    async def tick(self, dt=1):
        now = time.time()
        with Session() as db:
            rows = list(db.scalars(select(Sensor)))
        self.sensors = []
        for row in rows:
            failed = (
                self.mode == "SIMULATED"
                and self.scene.scenario == "failure"
                and row.id == "ir-01"
                and int(self.scene.time) % 30 > 8
            )
            offline = not row.enabled or failed
            health = self.real_health.get(row.id, {})
            self.sensors.append(
                dict(
                    id=row.id,
                    name=row.name,
                    type=row.type,
                    enabled=row.enabled,
                    status=(
                        ("OFFLINE" if offline else "ONLINE")
                        if self.mode == "SIMULATED"
                        else ("OFFLINE" if offline else health.get("status", "OFFLINE"))
                    ),
                    latency=(
                        round(30 + abs(math.sin(self.scene.time + len(row.id))) * 35)
                        if self.mode == "SIMULATED"
                        else health.get("latency", 0)
                    ),
                    fps=(
                        12
                        if self.mode == "SIMULATED" and not offline
                        else health.get("fps", 0)
                    ),
                    resolution="640×360",
                    last_update=(
                        iso(now)
                        if self.mode == "SIMULATED"
                        else health.get("last_update")
                    ),
                    provenance=self.mode,
                    position=row.data.get("position", {"x": 0, "y": 0}),
                    temperature=None,
                    packet_loss=None,
                )
            )
        if self.mode == "SIMULATED" and self.scene.running:
            self.scene.time += dt * self.scene.speed
            observations = self.scene.read(now)
            online = {s["id"] for s in self.sensors if s["status"] == "ONLINE"}
            self.process([d for d in observations if d["sensor_id"] in online], now)
        elif self.mode == "REAL":
            self.tracks = self.tracker.update([], now)
        new_alerts = self.rules.evaluate(self.tracks, self.sensors, now)
        metrics = self.analytics()
        self.history.append(
            {
                "time": iso(now),
                "tracks": metrics["active_tracks"],
                "detections": len(self.detections),
                "confidence": round(metrics["confidence"] * 100, 1),
                "latency": metrics["latency"],
                "cpu": psutil.cpu_percent(),
                "alerts": metrics["alerts"],
            }
        )
        if True:  # Every evaluated alert is persisted before it is published.
            try:
                await asyncio.to_thread(
                    self.repository.persist,
                    self.tracks,
                    self.detections,
                    self.sensors,
                    new_alerts,
                    {k: v for k, v in metrics.items() if k != "history"},
                    iso(now),
                )
                self.alerts = (new_alerts + self.alerts)[:500]
                self.last_persist = now
                self.db_ok = True
            except Exception:
                self.db_ok = False
                logging.exception("persistence_failed")
        WS_CLIENTS.set(len(self.hub.clients))
        state = self.snapshot()
        await self.hub.publish(state)
        if self.redis:
            try:
                import json

                await self.redis.set("scc:live", json.dumps(state), ex=10)
                self.redis_ok = True
            except Exception:
                self.redis_ok = False
        if now - self.last_prune > 3600:
            self.last_prune = now
            await asyncio.to_thread(self.repository.prune, iso(now - 7 * 86400))

    async def loop(self):
        if REDIS_URL:
            from redis.asyncio import Redis

            self.redis = Redis.from_url(
                REDIS_URL, socket_connect_timeout=1, socket_timeout=1
            )
        previous = time.monotonic()
        await asyncio.sleep(1)
        while self.running:
            started = time.monotonic()
            dt = started - previous
            previous = started
            try:
                await self.tick(dt)
            except Exception:
                logging.exception("runtime_tick_failed")
            await asyncio.sleep(max(0.05, 1 - (time.monotonic() - started)))

    def reset(self):
        self.scene.time = 0
        self.tracker = CentroidTracker(prefix="T-" + uuid.uuid4().hex[:4])
        self.tracks = []
        self.detections = []
        self.history.clear()
        self.rules = AlertRules(self.zones)
        with Session() as db:
            from backend.app.models.entities import Scenario

            if db.get(Scenario, "real-mode-used"):
                self.demo_available = False
            config = db.get(Scenario, "alert-rules")
            if config:
                self.rules.unknown_seconds = config.data["unknown_seconds"]
                self.rules.latency_ms = config.data["latency_ms"]

    async def real_loop(self):
        from backend.app.services.video import RTSPVideoSource, FileVideoSource
        from ai.detectors.opencv import OpenCVDetector
        import cv2

        detector = OpenCVDetector()
        sources = {}
        attempt = {}
        try:
            while self.running:
                if self.mode != "REAL":
                    for src, _ in sources.values():
                        src.close()
                    sources.clear()
                    await asyncio.sleep(1)
                    continue
                with Session() as db:
                    configs = [
                        (s.id, c.protocol, c.endpoint)
                        for s, c in db.execute(
                            select(Sensor, CameraSource)
                            .join(CameraSource, Sensor.id == CameraSource.id)
                            .where(Sensor.enabled == True)
                        )
                    ]
                active = {c[0] for c in configs}
                for sid in list(sources):
                    if sid not in active:
                        sources.pop(sid)[0].close()
                observations = []
                for sid, protocol, endpoint in configs:
                    if protocol not in ["rtsp", "file"]:
                        continue
                    try:
                        if sid in sources and sources[sid][1] != (protocol, endpoint):
                            sources.pop(sid)[0].close()
                        if sid not in sources:
                            if time.time() - attempt.get(sid, 0) < 5:
                                continue
                            attempt[sid] = time.time()
                            source = await asyncio.to_thread(
                                (
                                    RTSPVideoSource
                                    if protocol == "rtsp"
                                    else FileVideoSource
                                ),
                                endpoint,
                            )
                            sources[sid] = (source, (protocol, endpoint))
                        start = time.perf_counter()
                        frame = await asyncio.to_thread(sources[sid][0].read)
                        if frame is None:
                            raise RuntimeError("Stream interrupted / file ended")
                        frame = cv2.resize(frame, (640, 360))
                        inference = time.perf_counter()
                        ds = await asyncio.to_thread(
                            detector.detect, frame, sid, time.time()
                        )
                        self.inference_ms = (time.perf_counter() - inference) * 1000
                        observations.extend(ds)
                        ok, jpeg = cv2.imencode(".jpg", frame)
                        if ok:
                            self.frame_jpegs[sid] = jpeg.tobytes()
                        elapsed = time.perf_counter() - start
                        self.real_health[sid] = {
                            "status": "ONLINE",
                            "latency": round(elapsed * 1000),
                            "fps": round(1 / max(0.001, elapsed), 1),
                            "last_update": iso(time.time()),
                        }
                    except Exception:
                        self.real_health[sid] = {"status": "OFFLINE"}
                        self.frame_jpegs.pop(sid, None)
                        if sid in sources:
                            sources.pop(sid)[0].close()
                        logging.warning("sensor_read_failed", extra={"sensor_id": sid})
                if observations:
                    self.process(observations, time.time())
                await asyncio.sleep(0.1)
        finally:
            for source, _ in sources.values():
                source.close()


def serialize(row):
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


runtime = Runtime()
