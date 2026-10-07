from typing import Literal
from pydantic import BaseModel, Field, field_validator


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class UserCreate(Login):
    role: Literal["ADMIN", "OPERATOR", "ANALYST", "VIEWER"] = "VIEWER"

    @field_validator("password")
    @classmethod
    def strong(cls, v):
        if len(v) < 12:
            raise ValueError("Use at least 12 characters")
        return v


class Position(BaseModel):
    x: float = Field(allow_inf_nan=False)
    y: float = Field(allow_inf_nan=False)
    z: float = Field(default=0, allow_inf_nan=False)


class Observation(BaseModel):
    detection_id: str = Field(max_length=120)
    class_name: Literal["Person", "Vehicle", "Animal", "Unknown"]
    confidence: float = Field(ge=0, le=1)
    bbox: list[float] = Field(min_length=4, max_length=4)
    timestamp: float
    sensor_id: str
    position: Position | None = None
    provenance: Literal["SIMULATED", "ESTIMATED", "REAL"] = "ESTIMATED"

    @field_validator("bbox")
    @classmethod
    def box(cls, v):
        if (
            not all(0 <= x <= 1 for x in v)
            or v[2] <= 0
            or v[3] <= 0
            or v[0] + v[2] > 1.001
            or v[1] + v[3] > 1.001
        ):
            raise ValueError("bbox is normalized x,y,width,height within frame")
        return v


class Ingest(BaseModel):
    detections: list[Observation] = Field(max_length=500)


class SensorInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    type: Literal["EO", "IR", "LOW_LIGHT", "ZOOM", "RADAR", "LIDAR", "GPS", "IMU"]
    enabled: bool = True
    endpoint: str = Field(default="", max_length=500)
    protocol: Literal["mock", "rtsp", "file", "webrtc"] = "mock"


class SimCommand(BaseModel):
    scenario: Literal["normal", "multiple", "failure", "unknown", "fusion", "dense"] = (
        "normal"
    )
    speed: Literal[0.5, 1, 2, 5] = 1


class ZoneInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    x: float = Field(ge=-500, le=500)
    y: float = Field(ge=-500, le=500)
    radius: float = Field(gt=0, le=500)


class ExperimentInput(BaseModel):
    model_version: str = Field(min_length=1, max_length=100)
    dataset: str = Field(min_length=1, max_length=100)
    parameters: dict = Field(default_factory=dict)


class AnnotationInput(BaseModel):
    kind: Literal[
        "false_positive",
        "missed_detection",
        "correct_association",
        "incorrect_association",
    ]
    track_id: str | None = None
    note: str = Field(default="", max_length=1000)


class RuleConfig(BaseModel):
    unknown_seconds: float = Field(default=8, ge=1, le=3600)
    latency_ms: float = Field(default=180, ge=10, le=10000)


class UserUpdate(BaseModel):
    enabled: bool = True
    role: Literal["ADMIN", "OPERATOR", "ANALYST", "VIEWER"]


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=256)
