import math, random
from ai.interfaces import SensorInterface
from simulation.scenarios.catalog import SCENARIOS


class Scene(SensorInterface):
    def __init__(self):
        self.time = 0.0
        self.scenario = "normal"
        self.speed = 1
        self.running = True
        self.rng = random.Random(42)

    def read(self, timestamp):
        count = next(s["count"] for s in SCENARIOS if s["id"] == self.scenario)
        result = []
        for i in range(count):
            cls = ["Vehicle", "Person", "Person", "Animal", "Vehicle", "Unknown"][i % 6]
            if self.scenario == "unknown" and i < 4:
                cls = "Unknown"
            angle = self.time * (0.025 + (i % 4) * 0.005) + i * 2.4
            radius = 40 + (i % 7) * 21
            x = math.cos(angle) * radius
            y = math.sin(angle) * radius * 0.7
            # Periodic occlusion exercises LOST -> REACQUIRED without recycling IDs.
            if i == 2 and 15 < self.time % 35 < 19:
                continue
            primary = ["eo-01", "ir-01", "ll-01", "zoom-01"][i % 4]
            sensors = (
                [primary, "radar-01"]
                if self.scenario == "fusion" or i % 3 == 0
                else [primary]
            )
            for sensor in sensors:
                if (
                    self.scenario == "failure"
                    and sensor == "ir-01"
                    and int(self.time) % 30 > 8
                ):
                    continue
                result.append(
                    dict(
                        detection_id=f"sim-{timestamp:.3f}-{i}-{sensor}",
                        class_name=cls,
                        confidence=0.78 + 0.18 * ((i * 13) % 10) / 10,
                        bbox=[
                            0.06 + (x + 190) / 440 * 0.72,
                            0.22 + (y + 160) / 380 * 0.55,
                            0.09 if cls == "Vehicle" else 0.04,
                            0.08 if cls == "Vehicle" else 0.14,
                        ],
                        timestamp=timestamp,
                        sensor_id=sensor,
                        position={
                            "x": x + (self.rng.random() - 0.5) * 0.2,
                            "y": y + (self.rng.random() - 0.5) * 0.2,
                            "z": 0,
                        },
                        provenance="SIMULATED",
                    )
                )
        return result
