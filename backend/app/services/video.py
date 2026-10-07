from abc import ABC, abstractmethod
import os, time, cv2


class VideoSource(ABC):
    @abstractmethod
    def read(self): ...
    @abstractmethod
    def close(self): ...
class FileVideoSource(VideoSource):
    def __init__(self, path):
        root = os.path.realpath(os.getenv("VIDEO_ROOT", "/media"))
        resolved = os.path.realpath(path)
        if not resolved.startswith(root + os.sep):
            raise ValueError("File must be inside VIDEO_ROOT")
        self.cap = cv2.VideoCapture(resolved)

    def read(self):
        ok, frame = self.cap.read()
        return frame if ok else None

    def close(self):
        self.cap.release()


class RTSPVideoSource(VideoSource):
    def __init__(self, endpoint):
        from urllib.parse import urlparse

        host = urlparse(endpoint).hostname
        allowed = os.getenv("ALLOWED_RTSP_HOSTS", "").split(",")
        if host not in allowed or not endpoint.startswith("rtsp://"):
            raise ValueError("RTSP host not in ALLOWED_RTSP_HOSTS")
        self.cap = cv2.VideoCapture(
            endpoint,
            cv2.CAP_FFMPEG,
            [
                cv2.CAP_PROP_OPEN_TIMEOUT_MSEC,
                3000,
                cv2.CAP_PROP_READ_TIMEOUT_MSEC,
                3000,
            ],
        )

    def read(self):
        ok, frame = self.cap.read()
        return frame if ok else None

    def close(self):
        self.cap.release()


class MockVideoSource(VideoSource):
    def read(self):
        return None  # Browser Canvas renders the shared simulation scene.

    def close(self):
        pass


class WebRTCVideoSource(VideoSource):
    def read(self):
        raise NotImplementedError(
            "A camera-specific signaling adapter is required; use HTML5 video in the client"
        )

    def close(self):
        pass
