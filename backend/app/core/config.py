import os, secrets
from pathlib import Path

DATA = Path(os.getenv("DATA_DIR", ".data"))
DATA.mkdir(parents=True, exist_ok=True)


def secret(name):
    path = Path(os.getenv("SECRET_DIR", str(DATA))) / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(secrets.token_urlsafe(36))
        path.chmod(0o600)
    return path.read_text().strip()


JWT_SECRET = os.getenv("JWT_SECRET") or secret("jwt_secret")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///" + str(DATA / "scc.db"))
if DATABASE_URL.startswith("postgresql") and "@" not in DATABASE_URL:
    DATABASE_URL = (
        "postgresql+psycopg://scc:" + secret("db_password") + "@postgres:5432/scc"
    )
REDIS_URL = os.getenv("REDIS_URL", "")
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD") or secret("bootstrap_password")
SESSION_MINUTES = int(os.getenv("SESSION_MINUTES", "30"))
