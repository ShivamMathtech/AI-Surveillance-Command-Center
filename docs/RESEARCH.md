# Research mode

Research is available to ADMIN, ANALYST, and the restricted simulation demo. The current runtime measures tracker execution time and, in real acquisition, detector execution time. Synthetic scenes do not undergo pixel inference; the UI displays N/A rather than a fabricated inference benchmark.

Each experiment captures:

- Unique experiment ID and timestamp.
- User-supplied model version and dataset name.
- Parameters as JSON metadata (these do not automatically reconfigure a model).
- Sensor configuration/health snapshot.
- Current metrics, bounded live history, and provenance.

Annotations support false_positive, missed_detection, correct_association, and incorrect_association, with an optional selected track and note. They are persisted independently and included in JSON export. CSV export contains flat experiment summaries.

Mean confidence is the mean reported score for visible tracks. Current continuity is the ratio of visible tracks to non-ended tracks, not an IDF1/MOTA/HOTA score. Sensor availability is a snapshot fraction, not cumulative SLA uptime. Inference FPS is the reciprocal of measured detector latency, not an end-to-end throughput guarantee. Association accuracy, GPU load, dropped frames, and unreported sensor telemetry remain unavailable.

For publication-quality evaluation, add ground-truth annotation, recording/site-level splits, model and dataset hashes, calibrated synchronization, deterministic experiment runs, MOTA/IDF1/HOTA, per-class precision/recall/AP, latency percentiles, failure analysis, ablations, and confidence intervals. Compare algorithms on identical held-out data. This release does not generate fictitious evaluation scores.
