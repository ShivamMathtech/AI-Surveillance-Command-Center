SCENARIOS = [
    {"id": "normal", "name": "Normal monitoring", "count": 12},
    {"id": "multiple", "name": "Multiple moving objects", "count": 22},
    {"id": "failure", "name": "Sensor failure", "count": 12},
    {"id": "unknown", "name": "Persistent unknown", "count": 14},
    {"id": "fusion", "name": "Multi-sensor detection", "count": 16},
    {"id": "dense", "name": "High-density environment", "count": 70},
]
SENSORS = [
    ("eo-01", "EO / Visible", "EO"),
    ("ir-01", "Thermal / IR", "IR"),
    ("ll-01", "Low-light", "LOW_LIGHT"),
    ("zoom-01", "Zoom camera", "ZOOM"),
    ("radar-01", "Radar", "RADAR"),
    ("lidar-01", "LiDAR", "LIDAR"),
    ("gps-01", "GPS reference", "GPS"),
    ("imu-01", "IMU reference", "IMU"),
]
