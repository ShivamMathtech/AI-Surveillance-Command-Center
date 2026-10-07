from ai.interfaces import BaseDetector


class ONNXDetector(BaseDetector):
    """Explicit pre/post-processing callbacks prevent assumptions about model output."""

    def __init__(self, path, preprocess, postprocess):
        import onnxruntime as ort

        self.session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.preprocess, self.postprocess = preprocess, postprocess

    def detect(self, frame, sensor_id, timestamp):
        tensor, context = self.preprocess(frame)
        raw = self.session.run(None, {self.session.get_inputs()[0].name: tensor})
        return self.postprocess(raw, context, sensor_id, timestamp)
