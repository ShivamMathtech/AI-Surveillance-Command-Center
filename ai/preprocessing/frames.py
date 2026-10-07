import cv2


def resize(frame, width=960):
    h, w = frame.shape[:2]
    return cv2.resize(frame, (width, round(h * width / w)))
