from abc import ABC, abstractmethod
from typing import Any


class BaseDetector(ABC):
    @abstractmethod
    def detect(self, frame: Any, sensor_id: str, timestamp: float) -> list[dict]: ...
class BaseClassifier(ABC):
    @abstractmethod
    def classify(self, detection: dict) -> str: ...
class BaseTracker(ABC):
    @abstractmethod
    def update(self, detections: list[dict], timestamp: float) -> list[dict]: ...
class SensorInterface(ABC):
    @abstractmethod
    def read(self, timestamp: float) -> list[dict]: ...
class BaseFusionEngine(ABC):
    @abstractmethod
    def fuse(self, measurements: list[dict]) -> list[dict]: ...
class AlertRuleInterface(ABC):
    @abstractmethod
    def evaluate(
        self, tracks: list[dict], sensors: list[dict], timestamp: float
    ) -> list[dict]: ...


DetectorInterface = BaseDetector
TrackerInterface = BaseTracker
FusionInterface = BaseFusionEngine
