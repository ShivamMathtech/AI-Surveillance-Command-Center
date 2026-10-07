# REST API

Base URL: `/api`. Interactive OpenAPI: backend `/docs`. The bundled `openapi.json` is generated from the delivered FastAPI app. All request bodies use Pydantic validation. Errors use `{"detail": ...}`. IDs are opaque; use values returned by the server.

Authenticate with `POST /api/auth/login` and JSON `{"username":"...","password":"..."}`. Send `Authorization: Bearer <access_token>` on subsequent requests. Tokens expire after 30 minutes by default. The UI returns to login on expiry; there is no refresh-token flow.

| Method | Route | Access / behavior |
|---|---|---|
| POST | /auth/demo | Restricted simulation session when enabled |
| POST | /auth/login | Username/password JWT |
| GET | /auth/me | Current authenticated identity |
| POST | /auth/password | Change own password |
| GET, POST | /users | Admin list/create users |
| PATCH | /users/{username} | Admin change role/enabled; self-demotion blocked |
| GET | /live | Current full snapshot |
| GET, POST | /sensors | View / admin add |
| PATCH | /sensors/{id} | Admin edit/disable |
| GET | /sensors/{id}/config | Admin-only endpoint configuration |
| POST | /sensors/{id}/test | Admin adapter connection test |
| GET | /video/{id}/frame | Authenticated latest real JPEG; 503 if unavailable |
| GET | /tracks | Query, class, status, sensor, confidence, since, offset, limit |
| GET | /tracks/{id} | Details, recent events, recent detections |
| GET | /detections | Most recent persisted detections |
| POST | /detections/ingest | Admin/operator, real mode only |
| GET | /alerts | Current recent alerts |
| POST | /alerts/{id}/acknowledge | Admin/operator; demo only for simulation |
| POST | /alerts/{id}/mute | Suppress in active UI; remains persisted |
| POST | /alerts/{id}/investigate | Audit investigation and return context |
| GET, POST | /zones | View / admin add circular local zone |
| GET, PUT | /rules | View / admin configure unknown duration and latency threshold |
| GET | /analytics | Admin/operator/analyst/demo; minutes 1–10080 |
| GET | /system/health | Current host and subsystem health |
| GET | /simulation/status | State and scenario catalog |
| POST | /simulation/start | Scenario and speed |
| POST | /simulation/stop | Pause; history remains |
| POST | /simulation/reset | Reset scene and ID namespace; history remains |
| POST | /mode/{REAL or SIMULATED} | Admin only |
| GET | /playback?at=ISO8601 | Historical observations in prior two seconds |
| GET | /events | Latest 200 persisted events |
| GET, POST | /research/experiments | Admin/analyst/demo experiment snapshots |
| POST | /research/annotations | Persist review annotation |
| GET | /research/export?format=json | Experiments plus annotations |
| GET | /research/export?format=csv | Flat experiment summaries |

Simulation command:

```json
{"scenario":"fusion","speed":2}
```

Speeds: `0.5`, `1`, `2`, `5`. Scenarios: `normal`, `multiple`, `failure`, `unknown`, `fusion`, `dense`.

Sensor configuration:

```json
{"name":"Gate EO","type":"EO","enabled":true,"protocol":"file","endpoint":"/media/gate.mp4"}
```

Detection ingestion:

```json
{"detections":[{"detection_id":"camera-42-frame-900-box-1","class_name":"Person","confidence":0.88,"bbox":[0.1,0.2,0.1,0.3],"timestamp":1791288000.0,"sensor_id":"eo-01","position":null,"provenance":"REAL"}]}
```

Replace timestamp with current Unix seconds (within five seconds of server time). Bounding boxes are normalized `[x,y,width,height]`, fully within the image. Up to 500 detections per request. Register sensors first. A missing local position means image coordinates only.

A circular zone body contains `name`, `x`, `y`, `radius` in meters. Rule body contains `unknown_seconds` and `latency_ms`. A password change contains `current_password` and `new_password` (at least 12 characters).

Pagination applies database filters before limit/offset. Analytics samples are limited to the latest 10,000 records and downsampled to approximately 300 chart points; a seven-day selector is a requested window, not a guarantee that all seven days are retained at full resolution.

Response JSON schemas for domain snapshots are currently described by the TypeScript domain contracts and examples; the OpenAPI output primarily validates request contracts. Add fully typed response models before generating strict external SDKs.

Selecting REAL mode permanently disables anonymous demo access for that database, including after returning to simulation, to protect historical real observations. Continue using authenticated accounts. Use a separate fresh deployment for public demonstrations.
