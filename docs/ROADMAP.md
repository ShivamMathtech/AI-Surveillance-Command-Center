# Development roadmap

1. Field integration: sensor intrinsics/extrinsics, full 3D transforms, clock synchronization, radiometric IR and device-specific health.
2. AI validation: model-specific ONNX/PyTorch adapters, licensed weights, ByteTrack/BoT-SORT adapters, ground-truth evaluation and association metrics.
3. Video transport: authenticated WebRTC signaling and TURN, dedicated per-source capture workers, bounded frame buffers, optional encrypted evidence recording and media-time replay.
4. GIS: configured/licensed street/satellite/terrain providers, terrain elevation, polygon editor, calibrated sensor FOV geometry, full historical sensor poses.
5. Enterprise security: OIDC/SSO, MFA, revocable sessions, hardware-backed secret storage, trusted distributed rate limits, audited authorization tests.
6. Scale: authoritative external acquisition service, broker/outbox, entity deltas, track virtualization, batched render buffers, load tests with explicit latency/FPS SLOs.
7. Persistence: immutable migration definitions, native timestamp columns, time partitioning, compression, retention administration, backups and restore verification.
8. Research: repeatable experiment runs, dataset/version hashes, annotation tooling, precision/recall/AP and MOTA/IDF1/HOTA with uncertainty estimates.
9. Operations: OpenTelemetry traces, inference queue metrics, sensor health history, GPU metrics, failure injection, long-duration soak and recovery tests.

Keep all development focused on defensive monitoring and research. No engagement, firing, weapon aiming, or offensive modules are part of this roadmap.
