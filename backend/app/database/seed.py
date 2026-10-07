from sqlalchemy import select
from backend.app.database.session import Session
from backend.app.models.entities import Role, User, Sensor, Zone, Scenario
from backend.app.core.security import hasher
from backend.app.core.config import ADMIN_USERNAME, ADMIN_PASSWORD
from simulation.scenarios.catalog import SENSORS, SCENARIOS


def seed():
    with Session.begin() as db:
        for role in ["ADMIN", "OPERATOR", "ANALYST", "VIEWER"]:
            if not db.get(Role, role):
                db.add(Role(id=role))
        db.flush()
        if not db.get(User, ADMIN_USERNAME):
            db.add(
                User(
                    id=ADMIN_USERNAME,
                    password=hasher.hash(ADMIN_PASSWORD),
                    role="ADMIN",
                )
            )
        for i, (sid, name, kind) in enumerate(SENSORS):
            if not db.get(Sensor, sid):
                db.add(
                    Sensor(
                        id=sid,
                        name=name,
                        type=kind,
                        enabled=True,
                        data={
                            "position": {
                                "x": (i % 4 - 1.5) * 70,
                                "y": (i // 4 - 0.5) * 90,
                            }
                        },
                    )
                )
        if not db.get(Zone, "zone-01"):
            db.add(
                Zone(
                    id="zone-01",
                    name="North perimeter",
                    data={"x": 60, "y": 25, "radius": 65},
                )
            )
        for s in SCENARIOS:
            if not db.get(Scenario, s["id"]):
                db.add(Scenario(id=s["id"], data=s))
