import os, secrets
from pathlib import Path

root = Path("/secrets")
root.mkdir(exist_ok=True)
for name in ["db_password", "jwt_secret", "bootstrap_password"]:
    path = root / name
    if not path.exists():
        path.write_text(secrets.token_urlsafe(36))
    os.chown(path, 10001, 10001)
    path.chmod(0o444 if name == "db_password" else 0o400)
