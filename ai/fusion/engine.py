import math
from ai.interfaces import BaseFusionEngine


class SpatialFusion(BaseFusionEngine):
    """Time-gated, distance-gated association of calibrated local measurements."""

    def __init__(self, gate=5.0, window=0.4):
        self.gate, self.window = gate, window

    def fuse(self, measurements):
        groups = []
        for m in sorted(measurements, key=lambda v: v["confidence"], reverse=True):
            if m.get("position") is None:
                groups.append([m])
                continue
            for g in groups:
                a = g[0]
                if a.get("position") is None:
                    continue
                if (
                    a["class_name"] == m["class_name"]
                    and m["sensor_id"] not in [x["sensor_id"] for x in g]
                    and abs(a["timestamp"] - m["timestamp"]) <= self.window
                    and math.hypot(
                        a["position"]["x"] - m["position"]["x"],
                        a["position"]["y"] - m["position"]["y"],
                    )
                    < self.gate
                ):
                    g.append(m)
                    break
            else:
                groups.append([m])
        result = []
        for g in groups:
            item = dict(g[0])
            total = sum(x["confidence"] for x in g)
            item["sensor_sources"] = list(dict.fromkeys(x["sensor_id"] for x in g))
            item["detection_ids"] = [x["detection_id"] for x in g]
            item["confidence"] = (
                sum(x["confidence"] ** 2 for x in g) / total if total else 0
            )
            if item.get("position"):
                item["position"] = {
                    k: sum(x["position"].get(k, 0) * x["confidence"] for x in g) / total
                    for k in ["x", "y", "z"]
                }
                item["disagreement"] = max(
                    math.hypot(
                        x["position"]["x"] - item["position"]["x"],
                        x["position"]["y"] - item["position"]["y"],
                    )
                    for x in g
                )
            result.append(item)
        return result
