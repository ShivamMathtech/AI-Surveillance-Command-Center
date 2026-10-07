# WebSocket protocol

Endpoints: `/ws/live`, `/ws/detections`, `/ws/tracks`, `/ws/sensors`, `/ws/alerts`, `/ws/system`.

Connect through the same origin as the dashboard. The first client message must arrive within five seconds:

```json
{"token":"<JWT>"}
```

The token is not put in URLs, browser history, or request access logs. Browser Origin must match Host. Nginx forwards the original Host including port. Off-origin browser connections are rejected.

The first server message is a full snapshot:

```json
{"type":"snapshot","sequence":12,"data":{"tracks":[],"detections":[],"sensors":[],"alerts":[],"zones":[],"analytics":{},"simulation":{},"system":{},"timestamp":"2026-10-06T10:00:00+00:00"}}
```

Live changes are `{"type":"state","sequence":13,"data":{...}}`. Topic endpoints return only the corresponding data property. A heartbeat is `{"type":"heartbeat"}`. A subscriber queue holds at most two updates; old queued updates are replaced, since every update is a complete current snapshot.

Sequence numbers are process-local and monotonic. They reset on backend restart. The client uses new snapshots after reconnect; it does not infer missing entities from a skipped sequence. This is latest-state delivery, not a durable event stream. Query REST history for persisted evidence.

The UI reconnects with bounded exponential delay: 0.5 s, 1 s, 2 s, 4 s, 8 s, then 15 s. A 25-second message watchdog forces a stale connection to reconnect. JWT expiry closes with code 4001 and requires login. Demo sessions are disconnected when real acquisition is selected. Invalid channel/origin uses policy-violation code 1008.

Use one backend worker. A production multi-instance version needs a shared authoritative acquisition service, broker, entity-level deltas, server-side session revocation, and subscription permissions.
