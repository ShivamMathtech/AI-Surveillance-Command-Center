import cv2, uuid
from ai.interfaces import BaseDetector


class OpenCVDetector(BaseDetector):
    """CPU HOG person baseline. Not a general object or thermal detector."""

    def __init__(self):
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    def detect(self, frame, sensor_id, timestamp):
        h, w = frame.shape[:2]
        if h < 128 or w < 64:
            return []
        boxes, weights = self.hog.detectMultiScale(
            frame, winStride=(8, 8), padding=(8, 8), scale=1.05
        )
        return [
            dict(
                detection_id=str(uuid.uuid4()),
                class_name="Person",
                confidence=min(0.99, max(0.01, float(score))),
                bbox=[x / w, y / h, min(bw, w - x) / w, min(bh, h - y) / h],
                timestamp=timestamp,
                sensor_id=sensor_id,
                position=None,
                provenance="REAL",
            )
            for (x, y, bw, bh), score in zip(boxes, weights)
        ]
