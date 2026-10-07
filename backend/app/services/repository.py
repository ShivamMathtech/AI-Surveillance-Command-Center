from sqlalchemy import select, delete
from backend.app.database.session import Session
from backend.app.models.entities import (
    Track,
    TrackPoint,
    Detection,
    Alert,
    Event,
    SensorMeasurement,
    SystemMetric,
)
import uuid


class AlertRepository:
    @staticmethod
    def recent(db, limit=100):
        return db.scalars(
            select(Alert).order_by(Alert.timestamp.desc()).limit(limit)
        ).all()


class StateRepository:
    def persist(self, tracks, detections, sensors, alerts, metrics, timestamp):
        with Session.begin() as db:
            for t in tracks:
                db.merge(
                    Track(
                        id=t["id"],
                        class_name=t["class_name"],
                        status=t["status"],
                        first_seen=t["first_seen"],
                        last_seen=t["last_seen"],
                        data=t,
                    )
                )
            db.flush()
            for t in tracks:
                if t["status"] == "NEW":
                    db.add(
                        Event(
                            id=str(uuid.uuid4()),
                            timestamp=timestamp,
                            track_id=t["id"],
                            type="detected",
                            data={
                                "message": "Track created",
                                "provenance": t["provenance"],
                            },
                        )
                    )
                if t["position"] and t["status"] in ["NEW", "ACTIVE", "REACQUIRED"]:
                    db.add(
                        TrackPoint(
                            track_id=t["id"],
                            timestamp=timestamp,
                            x=t["position"]["x"],
                            y=t["position"]["y"],
                        )
                    )
            for d in detections:
                db.merge(
                    Detection(
                        id=d["detection_id"],
                        sensor_id=d["sensor_id"],
                        track_id=d.get("track_id"),
                        timestamp=timestamp,
                        data=d,
                    )
                )
            for s in sensors:
                db.add(
                    SensorMeasurement(sensor_id=s["id"], timestamp=timestamp, data=s)
                )
            for a in alerts:
                db.add(Alert(**a))
                db.add(
                    Event(
                        id=str(uuid.uuid4()),
                        timestamp=timestamp,
                        track_id=a["track_id"],
                        type=a["type"],
                        data=a,
                    )
                )
            db.add(SystemMetric(timestamp=timestamp, data=metrics))

    def prune(self, before):
        with Session.begin() as db:
            for table in [TrackPoint, Detection, SensorMeasurement, SystemMetric]:
                db.execute(delete(table).where(table.timestamp < before))
