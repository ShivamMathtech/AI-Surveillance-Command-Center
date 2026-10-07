# Architecture

The repository separates acquisition, computer vision, fusion, tracking, persistence, transport, and rendering. The backend is one FastAPI process with two managed asyncio tasks: state/simulation tick and real video acquisition. Blocking OpenCV reads, inference, and database batch persistence use worker threads. File/RTSP failures are caught per sensor.

## Core contracts

- `BaseDetector.detect(frame, sensor_id, timestamp)` returns normalized bounding boxes and class scores.
- `BaseClassifier.classify(detection)` maps labels into the four-class vocabulary. `LabelClassifier` is available for a custom detector pipeline; bundled detectors already emit the vocabulary.
- `BaseTracker.update(observations, timestamp)` returns track state.
- `BaseFusionEngine.fuse(measurements)` joins compatible observations from distinct sensors.
- `SensorInterface.read(timestamp)` supplies observations; `Scene` implements it.
- `AlertRuleInterface.evaluate(tracks, sensors, timestamp)` returns alert candidates.
- `VideoSource.read()` returns a BGR frame or `None`; `close()` releases resources.

## Runtime and persistence

The simulation creates local observations, including controlled occlusions. Spatial fusion precedes global tracking so duplicate cross-sensor observations do not immediately create duplicate tracks. This is an intentional concrete interpretation of the requested pipeline; camera-specific local tracking can be inserted before fusion later.

Tracks store current snapshots and a bounded in-memory path of 180 points. Relational points and detections support replay independently of the current in-memory track list. IDs include a run namespace plus a monotonic sequence. Reset creates a new namespace and keeps database history. Restart starts fresh live identities.

The state loop normally runs once a second and persists a transaction before publishing updates. Raw observation records older than seven days are pruned hourly. Track summaries, alerts, experiments, and audit records remain until an explicit operational retention policy is applied.

Redis receives a latest-state snapshot with a ten-second TTL. Redis failures mark cache health degraded; acquisition continues. This cache is not a work queue or multi-process synchronization mechanism. Run exactly one backend worker.

## Client architecture

React uses separate Zustand stores for sensors, tracks, detections, alerts, simulation, system, authentication, and shared spatial selection. TanStack Query handles table/history/detail/admin resources. Canvas scenes read current tracks through refs and render at a maximum of 12 FPS. Map and Three.js modules load lazily. Error boundaries isolate spatial rendering failures.

The first authenticated state is a complete snapshot; later envelopes are also complete current snapshots. Domain stores are updated separately. A network gap is resolved by reconnecting and obtaining a fresh snapshot rather than replaying an unreliable partial event buffer.

## Provenance

`SIMULATED` describes generated scene data. `REAL` describes actual pixel observations or externally submitted measurements. `ESTIMATED` marks unvalidated derived data. Geographic positions require caller-supplied calibrated local measurements. Image-only detections never receive invented latitude/longitude.

The local origin is 30.3165 N, 78.0322 E, altitude 640 m for demonstration. It is not a claim that sensors are deployed at that location. Map and 3D building geometry is illustrative.
