import math


class CoordinateService:
    """Local tangent approximation, intended for <5 km demos; not survey grade."""

    def __init__(self, lat=30.3165, lon=78.0322, alt=640):
        self.lat, self.lon, self.alt = lat, lon, alt

    def local_to_world(self, x, y, z=0):
        return {
            "latitude": self.lat + y / 111320,
            "longitude": self.lon + x / (111320 * math.cos(math.radians(self.lat))),
            "altitude": self.alt + z,
        }

    def world_to_local(self, latitude, longitude, altitude=640):
        return {
            "x": (longitude - self.lon) * 111320 * math.cos(math.radians(self.lat)),
            "y": (latitude - self.lat) * 111320,
            "z": altitude - self.alt,
        }

    def sensor_to_local(self, p, origin, yaw):
        a = math.radians(yaw)
        return {
            "x": origin[0] + p[0] * math.cos(a) - p[1] * math.sin(a),
            "y": origin[1] + p[0] * math.sin(a) + p[1] * math.cos(a),
            "z": origin[2] + p[2],
        }
