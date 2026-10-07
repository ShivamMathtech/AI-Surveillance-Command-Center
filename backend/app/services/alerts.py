import uuid
from ai.interfaces import AlertRuleInterface
from ai.trackers.centroid import iso


class AlertRules(AlertRuleInterface):
    def __init__(self, zones):
        self.zones = zones
        self.inside = {}
        self.status = {}
        self.emitted = {}
        self.unknown_seconds = 8
        self.latency_ms = 180

    def evaluate(self, tracks, sensors, timestamp):
        result = []

        def emit(kind, severity, message, track=None, sensor=None, zone=None):
            key = (kind, track, sensor, zone)
            if timestamp - self.emitted.get(key, -1e12) < 15:
                return
            self.emitted[key] = timestamp
            result.append(
                dict(
                    id=str(uuid.uuid4()),
                    type=kind,
                    severity=severity,
                    message=message,
                    track_id=track,
                    sensor_id=sensor,
                    zone_id=zone,
                    timestamp=iso(timestamp),
                    acknowledged=False,
                    muted=False,
                )
            )

        for t in tracks:
            key = t["id"]
            prev = self.status.get(key)
            self.status[key] = t["status"]
            if t["status"] == "LOST" and prev != "LOST":
                emit("track_lost", "MEDIUM", f"{key} observation lost", key)
            if t["status"] == "REACQUIRED":
                emit("track_reacquired", "INFO", f"{key} reacquired", key)
            from datetime import datetime

            if (
                t["class_name"] == "Unknown"
                and timestamp - datetime.fromisoformat(t["first_seen"]).timestamp()
                > self.unknown_seconds
            ):
                emit(
                    "persistent_unknown",
                    "MEDIUM",
                    "Unknown classification requires review",
                    key,
                )
            if t.get("disagreement", 0) > 3:
                emit(
                    "sensor_disagreement",
                    "LOW",
                    "Sensor positions disagree by over 3 m",
                    key,
                )
            if not t["position"] or t["status"] in ["LOST", "ENDED"]:
                continue
            for z in self.zones:
                p = t["position"]
                inside = (p["x"] - z["x"]) ** 2 + (p["y"] - z["y"]) ** 2 < z[
                    "radius"
                ] ** 2
                zk = (key, z["id"])
                before = self.inside.get(zk, False)
                self.inside[zk] = inside
                if inside and not before:
                    emit(
                        "zone_entry",
                        "HIGH",
                        f'{key} entered {z["name"]}',
                        key,
                        zone=z["id"],
                    )
                if before and not inside:
                    emit(
                        "zone_exit",
                        "INFO",
                        f'{key} left {z["name"]}',
                        key,
                        zone=z["id"],
                    )
        for s in sensors:
            if s["status"] == "OFFLINE":
                emit(
                    "sensor_offline", "HIGH", f'{s["name"]} is offline', sensor=s["id"]
                )
            elif s["latency"] > self.latency_ms:
                emit(
                    "high_latency",
                    "LOW",
                    f'{s["name"]} latency exceeds {self.latency_ms} ms',
                    sensor=s["id"],
                )
        return result
