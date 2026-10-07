import math
from datetime import datetime, timezone
from ai.interfaces import BaseTracker


def iso(t):
    return datetime.fromtimestamp(t, timezone.utc).isoformat()


class CentroidTracker(BaseTracker):
    """Bounded nearest-neighbor baseline; replace for crowded/occluded scenes."""

    def __init__(self, gate=18, lost_after=2, ended_after=12, prefix="T"):
        self.tracks = {}
        self.serial = 0
        self.gate = gate
        self.lost_after = lost_after
        self.ended_after = ended_after
        self.prefix = prefix

    def update(self, detections, timestamp):
        available = {k for k, t in self.tracks.items() if t["status"] != "ENDED"}
        for d in detections:
            pos = d.get("position")
            # Uncalibrated observations stay in image coordinates; never placed on a geographic map.
            xy = (
                pos
                if pos
                else {
                    "x": (d["bbox"][0] + d["bbox"][2] / 2) * 1000,
                    "y": (d["bbox"][1] + d["bbox"][3] / 2) * 1000,
                    "z": 0,
                }
            )
            candidates = []
            for key in available:
                old = self.tracks[key]
                if old["class_name"] != d["class_name"] or old["coordinate_space"] != (
                    "LOCAL" if pos else "IMAGE"
                ):
                    continue
                if not pos and old["sensor_sources"] != d.get(
                    "sensor_sources", [d["sensor_id"]]
                ):
                    continue
                elapsed = max(0.001, timestamp - old["_time"])
                distance = math.hypot(
                    old["_xy"]["x"] + old["velocity"][0] * min(elapsed, 2) - xy["x"],
                    old["_xy"]["y"] + old["velocity"][1] * min(elapsed, 2) - xy["y"],
                )
                if distance < (self.gate if pos else 100):
                    candidates.append((distance, key))
            if candidates:
                _, key = min(candidates)
                available.remove(key)
                t = self.tracks[key]
                dt = max(0.001, timestamp - t["_time"])
                vx = (xy["x"] - t["_xy"]["x"]) / dt
                vy = (xy["y"] - t["_xy"]["y"]) / dt
                t["status"] = "REACQUIRED" if t["status"] == "LOST" else "ACTIVE"
                t["velocity"] = [vx, vy]
                t["direction"] = (math.degrees(math.atan2(vx, vy)) + 360) % 360
                t["speed"] = math.hypot(vx, vy) if pos else None
            else:
                self.serial += 1
                key = f"{self.prefix}-{self.serial:04d}"
                t = {
                    "id": key,
                    "first_seen": iso(timestamp),
                    "status": "NEW",
                    "trajectory": [],
                    "velocity": [0, 0],
                    "direction": 0,
                    "speed": 0 if pos else None,
                }
                self.tracks[key] = t
            t.update(
                class_name=d["class_name"],
                confidence=d["confidence"],
                last_seen=iso(timestamp),
                position=pos,
                coordinate_space="LOCAL" if pos else "IMAGE",
                bbox=d["bbox"],
                sensor_sources=d.get("sensor_sources", [d["sensor_id"]]),
                provenance=d["provenance"],
                _time=timestamp,
                _xy=xy,
                detection_ids=d.get("detection_ids", [d["detection_id"]]),
                disagreement=d.get("disagreement", 0),
            )
            t["trajectory"] = (
                t["trajectory"] + [dict(x=xy["x"], y=xy["y"], timestamp=iso(timestamp))]
            )[-180:]
        for key in available:
            t = self.tracks[key]
            age = timestamp - t["_time"]
            if age >= self.ended_after:
                t["status"] = "ENDED"
            elif age >= self.lost_after:
                t["status"] = "LOST"
        # Ended records remain in PostgreSQL, not unbounded process memory.
        for key in list(self.tracks):
            if timestamp - self.tracks[key]["_time"] > 300:
                del self.tracks[key]
        return [
            {k: v for k, v in t.items() if not k.startswith("_")}
            for t in self.tracks.values()
        ]
