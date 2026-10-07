import os, tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="scc-tests-")
os.environ["DEMO_MODE"] = "true"
import pytest
from fastapi.testclient import TestClient
from backend.app.models.entities import Base
from backend.app.database.session import engine
from backend.app.main import app


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def demo(client):
    return {
        "Authorization": "Bearer "
        + client.post("/api/auth/demo").json()["access_token"]
    }


@pytest.fixture
def admin(client):
    from backend.app.core.config import ADMIN_PASSWORD

    return {
        "Authorization": "Bearer "
        + client.post(
            "/api/auth/login", json={"username": "admin", "password": ADMIN_PASSWORD}
        ).json()["access_token"]
    }
