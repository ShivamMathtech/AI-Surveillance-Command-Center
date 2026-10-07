from ai.interfaces import BaseDetector, BaseClassifier


class MockDetector(BaseDetector):
    """Simulation supplies scene observations; never pretend pixels were inferred."""

    def detect(self, frame, sensor_id, timestamp):
        return [dict(x, sensor_id=sensor_id, timestamp=timestamp) for x in frame]


class LabelClassifier(BaseClassifier):
    def classify(self, detection):
        return (
            detection.get("class_name", "Unknown")
            if detection.get("class_name") in {"Person", "Vehicle", "Animal", "Unknown"}
            else "Unknown"
        )
