# Deployment and operations

## Compose topology

The initialization job generates persistent random PostgreSQL, JWT, and bootstrap-admin secrets. PostgreSQL and Redis are internal services. The backend waits for both health checks, applies migrations, seeds idempotently, and starts one acquisition worker. Nginx serves the built SPA and proxies API/WebSocket requests.

Only loopback ports 8080 (UI) and 8000 (API/docs/metrics) are published. The backend image runs as UID 10001 and is configured with no-new-privileges. Media is mounted read-only. Redis is a disposable latest-state cache with a 128 MiB cap and TTL; it has no externally published port. Secret volume values persist through normal restarts.

## Before a real deployment

Set `DEMO_MODE=false`. Use TLS at a controlled reverse proxy, restrict API/metrics exposure, configure proper backups and recovery drills, rotate generated bootstrap credentials, integrate a secret manager, and review dependencies/licenses. Demo mode permits anonymous users to generate simulated observations, alerts, annotations, and experiments; it is not appropriate on an unrestricted public endpoint.

Use role-separated accounts. ADMIN manages users/sensors/mode/zones/rules; OPERATOR manages simulation/alerts/ingestion; ANALYST accesses analytics/research; VIEWER observes. Demo has restricted simulation operations and no administration.

JWT uses HS256, audience/issuer validation, and an absolute expiry. Passwords use Argon2. Tokens stay in per-tab sessionStorage; an XSS compromise can still access them. No refresh tokens or immediate global revocation are implemented. REST rechecks account enabled/role state. Existing WebSocket privileges expire with the token; add revocation propagation for strict enterprise session control.

Rate limits are per-process/per-peer (login 10/min, general API 3000/min). Behind the bundled proxy, many users share one peer identity. For a public service use a trusted proxy-aware distributed limiter; do not blindly trust X-Forwarded-For.

## Observability

- `/health`: process liveness.
- `/ready`: database connectivity; cache degradation reported separately.
- `/metrics`: Prometheus API latency, pipeline latency, detection counts, active WebSocket clients, plus Python process metrics.
- JSON application log formatter; Uvicorn access logs retain their standard format.
- Dashboard: host CPU, host RAM, database/cache status through system response, session age, sensor health.

GPU information is unavailable without an explicit adapter. Host CPU/memory come from psutil and may differ from container quota utilization. Redis failure is nonfatal. Database persistence failures are logged and marked in system state; there is no durable offline spool. Do not treat observations generated while the database is unavailable as retained evidence.

## Scale and retention

Run **one backend worker**. Increasing Uvicorn workers creates duplicate simulation/acquisition loops and inconsistent live IDs. To scale, extract a single authoritative acquisition service, publish to Redis Streams/Kafka, use a durable outbox, distribute inference workers, and partition observation tables.

Raw detections, trajectory points, health samples, and metrics are pruned after seven days. Other records remain. Dense simulation can generate significant volume; configure realistic retention and quotas before unattended operation.

## Backup

Use PostgreSQL backups and save the secret volume through your approved backup tooling. A backup containing only the database cannot reconstruct the JWT/secret settings. Test restores to an isolated environment before relying on them. Do not delete secret volumes while retaining a database without deliberately resetting credentials.

## Troubleshooting

- Blank map/3D: enable WebGL/hardware acceleration; other panels remain usable.
- API 401: expired session; sign in again.
- Demo 403: demo disabled or real acquisition active; use an authorized account.
- RTSP offline: check exact host allowlist, protocol, credentials, reachability, codec support.
- File offline: check /media mount, supported codec, and end of file.
- Windows NumPy build failure: use Python 3.12 or Docker rather than Python 3.14.
- Missing Vite: run npm ci inside frontend first.
- Dependency platform error: do not copy node_modules from another OS; reinstall with npm ci.
- Slow first launch: wait for image/dependency downloads and migration/health checks.

Selecting REAL mode permanently disables anonymous demo access for that database, including after returning to simulation, to protect historical real observations. Continue using authenticated accounts. Use a separate fresh deployment for public demonstrations.
