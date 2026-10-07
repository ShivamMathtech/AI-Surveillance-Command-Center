# AI and sensor integration

## Bundled engines

`MockDetector` returns generated scene observations. `OpenCVDetector` uses the built-in HOG person descriptor on CPU; it does not identify vehicles/animals and is not validated for IR imagery. `CentroidTracker` is a class-gated nearest-neighbor baseline with velocity prediction, finite missing-observation windows, and bounded history.

`ONNXDetector` accepts caller-supplied preprocessing and postprocessing callbacks. This is necessary because exported models differ in layout, normalization, box format, NMS behavior, and label mapping. `ai/requirements-optional.txt` lists optional ONNX Runtime and PyTorch engines, but no model files are downloaded or silently trusted.

## Plug in a model

1. Implement `BaseDetector.detect(frame, sensor_id, timestamp)` in `ai/detectors/`.
2. Produce normalized boxes and one of Person/Vehicle/Animal/Unknown. Generate unique observation IDs.
3. Map model-specific categories through a `BaseClassifier` implementation if needed.
4. Select your detector in `Runtime.real_loop` instead of `OpenCVDetector`.
5. Return `position: null` for uncalibrated images. Do not invent world coordinates from a bounding box.
6. Add detector contract tests for output shape, bounds, absent objects, malformed input, and missing weights.
7. Record model version, dataset, parameters, sensor setup, and measured results in Research.

A ByteTrack adapter can implement `BaseTracker`; preserve the existing output fields and identity lifecycle. The frontend does not require model-specific changes. Provide license notices and provenance for any downloaded weights or datasets.

## Real video

Place a test video in `media/`. Log in as an administrator, add a file sensor with `/media/your-video.mp4`, then switch to REAL in Settings. File paths are constrained to VIDEO_ROOT. End-of-file produces a disconnected state and retry reopens the source; it is not an accurate media-time playback controller.

For RTSP, put exact hosts in `.env`, for example `ALLOWED_RTSP_HOSTS=192.168.1.50,192.168.1.51`, restart the backend, and configure an endpoint in Sensors. Never put credentials in shared screenshots or git. Endpoint configuration is admin-only and is never included in the general sensor response. The adapter sets OpenCV open/read timeouts and retries failed connections at five-second intervals.

The UI polls the latest real JPEG using a bearer header. Canvas draws detector overlays. No MJPEG URL includes a token. This baseline uses sequential CPU acquisition per configured source; use dedicated workers and bounded frame queues for many streams.

`WebRTCVideoSource` intentionally raises `NotImplementedError` until a camera-specific signaling adapter is provided. Native RTSP cannot be loaded directly into an HTML video tag. For browser WebRTC add ICE/STUN/TURN, authenticated signaling, peer lifecycle, and an HTML5 video surface with synchronized overlays. Do not claim universal camera compatibility.

## Non-image measurements and coordinates

Use authenticated `/api/detections/ingest` for externally processed radar/LiDAR or calibrated camera observations. Use current synchronized timestamps and registered sensor IDs. The schema accepts a calibrated local position with x/y/z in meters. Transform sensor-local coordinates with `CoordinateService.sensor_to_local` and then map through `local_to_world`.

The supplied transform is yaw plus translation with a small-area tangent approximation. Intrinsics, extrinsics, lens distortion, time offset, terrain intersection, and full 3D orientation calibration must be implemented and validated for the actual sensor rig.

Fusion gates distinct sensor sources within 0.4 seconds and 5 m by default. The confidence-weighted mean is an estimate, not a statistical accuracy guarantee. It has no covariance model; use a Kalman/EKF/UKF or probabilistic association adapter where the application warrants one.
