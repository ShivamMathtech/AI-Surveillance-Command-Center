import asyncio, contextlib, json, logging, time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import Response, JSONResponse
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Histogram
from backend.app.api.routes import router
from backend.app.core.security import decode, RateLimiter
from backend.app.database.session import Session
from backend.app.database.seed import seed
from backend.app.services.runtime import runtime


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps(
            {
                "timestamp": time.time(),
                "level": record.levelname,
                "message": record.getMessage(),
                "exception": (
                    self.formatException(record.exc_info) if record.exc_info else None
                ),
            }
        )


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler])
API_LATENCY = Histogram("scc_api_latency_seconds", "API latency", ["method"])


@asynccontextmanager
async def lifespan(app):
    seed()
    runtime.load()
    runtime.running = True
    await runtime.bootstrap_history()
    await runtime.tick()
    jobs = [
        asyncio.create_task(runtime.loop()),
        asyncio.create_task(runtime.real_loop()),
    ]
    yield
    runtime.running = False
    for job in jobs:
        job.cancel()
    for job in jobs:
        with contextlib.suppress(asyncio.CancelledError):
            await job
    if runtime.redis:
        await runtime.redis.aclose()


app = FastAPI(
    title="AI Surveillance Command Center", version="1.0.0", lifespan=lifespan
)
app.include_router(router)
limiter = RateLimiter()


@app.middleware("http")
async def middleware(request: Request, call_next):
    start = time.perf_counter()
    if request.url.path.startswith("/api/") and not limiter.allow(
        request.client.host, 3000
    ):
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    response = await call_next(request)
    API_LATENCY.labels(request.method).observe(time.perf_counter() - start)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health")
def health():
    return {"status": "alive"}


@app.get("/ready")
def ready():
    try:
        with Session() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ready", "redis": runtime.redis_ok}
    except Exception:
        raise HTTPException(503, "Database unavailable")


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.websocket("/ws/{channel}")
async def websocket(ws: WebSocket, channel: str):
    if channel not in ["live", "detections", "tracks", "sensors", "alerts", "system"]:
        await ws.close(code=1008)
        return
    # Token in first message, never query strings or access logs.
    origin = ws.headers.get("origin")
    host = ws.headers.get("host")
    if origin:
        from urllib.parse import urlparse

        if urlparse(origin).netloc != host:
            await ws.close(code=1008)
            return
    await ws.accept()
    q = None
    try:
        auth = await asyncio.wait_for(ws.receive_json(), 5)
        user = decode(auth.get("token", ""))
        if user["role"] == "DEMO" and (
            runtime.mode != "SIMULATED" or not runtime.demo_available
        ):
            await ws.close(code=4001)
            return
        q = runtime.hub.subscribe()
        await ws.send_json(
            {
                "type": "snapshot",
                "sequence": runtime.hub.sequence,
                "data": (
                    runtime.snapshot()
                    if channel == "live"
                    else runtime.snapshot().get(channel)
                ),
            }
        )
        while True:
            if time.time() > user["exp"] or (
                user["role"] == "DEMO"
                and (runtime.mode != "SIMULATED" or not runtime.demo_available)
            ):
                await ws.close(code=4001)
                break
            try:
                message = await asyncio.wait_for(q.get(), 10)
            except asyncio.TimeoutError:
                await ws.send_json({"type": "heartbeat"})
                continue
            if channel != "live":
                message = dict(message, data=message["data"].get(channel))
            await ws.send_json(message)
    except (WebSocketDisconnect, RuntimeError, asyncio.TimeoutError):
        pass
    except HTTPException:
        await ws.close(code=4001)
    finally:
        if q:
            runtime.hub.unsubscribe(q)
