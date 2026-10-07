from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def now():
    return datetime.now(timezone.utc).isoformat()


class Base(DeclarativeBase):
    pass


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String, primary_key=True)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    password: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(ForeignKey("roles.id"))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class Sensor(Base):
    __tablename__ = "sensors"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class CameraSource(Base):
    __tablename__ = "camera_sources"
    id: Mapped[str] = mapped_column(ForeignKey("sensors.id"), primary_key=True)
    protocol: Mapped[str] = mapped_column(String)
    endpoint: Mapped[str] = mapped_column(Text)


class Track(Base):
    __tablename__ = "tracks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    class_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    first_seen: Mapped[str] = mapped_column(String)
    last_seen: Mapped[str] = mapped_column(String, index=True)
    data: Mapped[dict] = mapped_column(JSON)


class TrackPoint(Base):
    __tablename__ = "track_points"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    track_id: Mapped[str] = mapped_column(ForeignKey("tracks.id"), index=True)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)


class Detection(Base):
    __tablename__ = "detections"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id"), index=True)
    track_id: Mapped[str | None] = mapped_column(ForeignKey("tracks.id"), nullable=True)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    data: Mapped[dict] = mapped_column(JSON)


class SensorMeasurement(Base):
    __tablename__ = "sensor_measurements"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id"), index=True)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    data: Mapped[dict] = mapped_column(JSON)


class Zone(Base):
    __tablename__ = "zones"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    data: Mapped[dict] = mapped_column(JSON)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    severity: Mapped[str] = mapped_column(String)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    type: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    track_id: Mapped[str | None] = mapped_column(ForeignKey("tracks.id"), nullable=True)
    sensor_id: Mapped[str | None] = mapped_column(
        ForeignKey("sensors.id"), nullable=True
    )
    zone_id: Mapped[str | None] = mapped_column(ForeignKey("zones.id"), nullable=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    muted: Mapped[bool] = mapped_column(Boolean, default=False)


class Event(Base):
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    track_id: Mapped[str | None] = mapped_column(ForeignKey("tracks.id"), nullable=True)
    type: Mapped[str] = mapped_column(String)
    data: Mapped[dict] = mapped_column(JSON)


class SystemMetric(Base):
    __tablename__ = "system_metrics"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    data: Mapped[dict] = mapped_column(JSON)


class Scenario(Base):
    __tablename__ = "simulation_scenarios"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)


class Experiment(Base):
    __tablename__ = "experiments"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    timestamp: Mapped[str] = mapped_column(String)
    data: Mapped[dict] = mapped_column(JSON)


class Annotation(Base):
    __tablename__ = "annotations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    timestamp: Mapped[str] = mapped_column(String)
    data: Mapped[dict] = mapped_column(JSON)
