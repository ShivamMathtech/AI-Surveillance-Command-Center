# Implementation coverage

This document distinguishes implemented behavior from integration hooks and planned enhancements. It takes precedence over broad aspirational product requirements.

| Area | Delivered behavior | Boundary |
|---|---|---|
| Startup | One-command Compose definition, generated secrets, migrations, initial user/sensors/zones, automatic simulation | Docker daemon unavailable in build environment; container boot not verified there |
| Cameras | Four animated Canvas scenes, timestamp, FPS label, bounding boxes, paths, fullscreen, snapshot, local recording, zoom | Procedural scenes; thermal/low-light are illustrative effects, not true sensor physics |
| Real acquisition | File and allowlisted RTSP via OpenCV; authenticated frame endpoint; CPU HOG person detector; failure/retry health | No camera hardware supplied; WebRTC signaling is an explicit unsupported adapter hook |
| Detection abstraction | BaseDetector, BaseClassifier, mock detector, OpenCV HOG, optional ONNX callback adapter | No YOLO weights, model-specific parser, or PyTorch model packaged |
| Tracking | Predictive nearest-neighbor association, persistent IDs within a run, NEW/ACTIVE/LOST/REACQUIRED/ENDED, paths and history | Not ByteTrack; identity can switch in dense crossings; active identities do not survive process restart |
| Fusion | Class/distance/time gating, distinct-source association, confidence-weighted local estimates | No covariance-calibrated fusion, hardware clock synchronization, or sensor-specific calibration |
| Coordinates | Local-to-lat/lon/alt, inverse transform, sensor yaw transform, uncalibrated image-space exclusion | Small-area tangent approximation; orientation transform accepts yaw only |
| Map | Offline MapLibre local grid, labels, tracks, trajectory, sensor markers, coverage, circular zones, pan/zoom/layers/reset | Satellite/street/terrain tiles and elevation providers are not configured; no online map account needed |
| 3D | Interactive Three.js local ground/buildings/roads/sensor mounts/objects/zones/paths | Simplified illustrative geometry, not survey terrain or a digital twin; no weapon representation |
| Alerts | Zone entry/exit, persistent unknown, sensor offline/latency, track loss/reacquisition, sensor disagreement, acknowledge/mute/investigate | No real radiometric thermal anomaly detector; rule thresholds configurable through REST |
| Playback | Database detections and paths with shared timestamp across camera reconstruction, map, 3D, track details | No server-side raw-video archive, seeking, or camera/audio synchronization |
| Persistence | Relational SQLAlchemy models, Alembic initial migration, PostgreSQL in Compose, SQLite development | Simple initial migration imports current metadata; freeze it before evolving schema |
| Security | JWT expiry, Argon2, roles, random secrets, audit events, validation, rate limits, RTSP allowlist | No SSO/MFA, token revocation list, distributed rate limiter, encrypted secrets manager, or security audit |
| Analytics | Persisted observation trends, class distribution, model confidence, current visible ratio, availability, latency, host CPU/memory | No inferred accuracy; GPU, dropped frame counts, and unreported hardware telemetry show unavailable |
| Research | Experiment metadata + snapshot, annotations, JSON/CSV exports | Snapshot experiments, not a training orchestrator or automatic benchmark harness |
| Performance | 1 Hz scene/state updates; bounded WebSocket queues; 12 FPS procedural canvas; lazy map/3D chunks; table pagination | Full latest-state envelopes, not fine-grained entity deltas; 60 FPS and multi-thousand-track scale unvalidated |
| Deployment | Nginx SPA/API/WS proxy; backend health; internal Redis/PostgreSQL; CI build/test workflow | One backend worker only; Redis is a latest-state cache, not a distributed acquisition coordinator |

The README and UI deliberately avoid presenting simulation confidence as detection accuracy. A separate validation dataset, labeled ground truth, and calibrated sensors are needed for real performance claims.
