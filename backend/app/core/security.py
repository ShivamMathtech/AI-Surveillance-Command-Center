import time
from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.core.config import JWT_SECRET, SESSION_MINUTES, DEMO_MODE
from backend.app.database.session import Session
from backend.app.models.entities import User

hasher = PasswordHasher()
bearer = HTTPBearer(auto_error=False)


def token(subject, role):
    return jwt.encode(
        {
            "sub": subject,
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=SESSION_MINUTES),
            "iat": datetime.now(timezone.utc),
            "iss": "scc",
            "aud": "scc-ui",
        },
        JWT_SECRET,
        algorithm="HS256",
    )


def decode(value):
    try:
        p = jwt.decode(
            value, JWT_SECRET, algorithms=["HS256"], audience="scc-ui", issuer="scc"
        )
        if p["sub"] == "demo" and DEMO_MODE:
            return p
        with Session() as db:
            user = db.get(User, p["sub"])
            if not user or not user.enabled:
                raise ValueError()
            p["role"] = user.role
        return p
    except Exception:
        raise HTTPException(401, "Session expired or invalid")


def current(auth: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not auth:
        raise HTTPException(401, "Authentication required")
    user = decode(auth.credentials)
    if user["role"] == "DEMO":
        from backend.app.services.runtime import runtime

        if runtime.mode != "SIMULATED" or not runtime.demo_available:
            raise HTTPException(
                403, "Demo sessions cannot view a database used for real acquisition"
            )
    return user


def permit(*roles):
    def check(user=Depends(current)):
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient permission")
        return user

    return check


class RateLimiter:
    def __init__(self):
        self.entries = {}

    def allow(self, key, limit=120):
        now = time.monotonic()
        cutoff = now - 60
        self.entries = {k: v for k, v in self.entries.items() if v[0] > cutoff}
        start, n = self.entries.get(key, (now, 0))
        self.entries[key] = (start, n + 1)
        return n < limit
