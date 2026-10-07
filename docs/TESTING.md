# Testing and verification

Verification performed in the build environment on 2026-10-06 with Python 3.12 and Node 24. The application targets Python 3.12 and Node 22 LTS in Docker.

| Check | Observed result |
|---|---|
| Backend pipeline/API/integration suite | 16 passed |
| React component/store/reconnect suite | 4 passed |
| TypeScript + Vite production build | Passed |
| Chromium operator workflow | 1 passed |
| SQLite Alembic upgrade and seed | Passed |
| PostgreSQL SQL DDL generation | Passed |
| OpenAPI generation | Passed |
| Docker Compose full startup | Not run; Docker daemon unavailable |
| PostgreSQL/Redis live integration | Not run in this environment |
| Physical RTSP / IR / radar / LiDAR hardware | Not tested |
| ONNX / PyTorch custom models | Not tested; no model supplied |
| Sustained load, failover, 60 FPS target | Not validated |

The browser test launched the backend and Vite together, opened Chromium, waited for the authenticated WebSocket connection, verified four Canvas feeds, selected a detection, opened Tracks and Research, saved an experiment, returned Home, and captured `dashboard.png`. It asserted no uncaught JavaScript errors. MapLibre and the Three.js view rendered in the screenshot.

Backend tests cover track creation/update/loss/reacquisition/end, unique association, fusion time/distance/source gates, coordinate round-trips, uncalibrated-image isolation, geofence entry/exit, sensor-offline rules, every scenario's observation schema, login/role restrictions, persistence, acknowledgment/mute, simulation commands, WebSocket snapshot/reconnect, user/sensor configuration, research exports, health/metrics, playback, ingestion validation, and demo denial after real acquisition.

Frontend tests cover status badges, accessible dialogs, shared selection/playback, and bounded reconnect delays. They do not claim exhaustive visual, accessibility, media-recording, or browser coverage.

Run from repository root:

```sh
python -m pytest tests -q
```

Frontend:

```sh
cd frontend
npm ci
npm test
npm run build
```

With both development servers running:

```sh
npx playwright install chromium
npx playwright test
```

For Compose set `BASE_URL` to `http://localhost:8080` before invoking Playwright. On PowerShell use `$env:BASE_URL='http://localhost:8080'`.

Known non-failing messages: Starlette's test client emitted an AnyIO deprecation warning, and Vite reported large MapLibre/Three.js chunks. Those modules are lazy-loaded but remain substantial downloads. Neither warning is a claimed production performance result.

Before production: run the actual Compose stack, exercise fresh and existing volumes, validate PostgreSQL backup/restore, test Redis/database/network interruption, test configured codecs and sensors, measure browser/host resource budgets, audit dependencies and authorization, and define acceptance thresholds using actual expected traffic.
