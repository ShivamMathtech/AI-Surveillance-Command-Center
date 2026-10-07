export type ObjectClass = "Person" | "Vehicle" | "Animal" | "Unknown";
export interface Point {
  x: number;
  y: number;
  z?: number;
  timestamp?: string;
}
export interface Track {
  id: string;
  class_name: ObjectClass;
  confidence: number;
  status: string;
  first_seen: string;
  last_seen: string;
  position: Point | null;
  coordinate_space: string;
  velocity: number[];
  direction: number;
  speed: number | null;
  trajectory: Point[];
  sensor_sources: string[];
  provenance: string;
  bbox: number[];
  disagreement: number;
  events?: EventItem[];
  detection_history?: Detection[];
}
export interface Detection {
  detection_id: string;
  class_name: ObjectClass;
  confidence: number;
  bbox: number[];
  timestamp: number;
  sensor_id: string;
  position: Point | null;
  track_id: string;
  provenance: string;
}
export interface Sensor {
  id: string;
  name: string;
  type: string;
  status: string;
  enabled: boolean;
  latency: number;
  fps: number;
  resolution: string;
  last_update: string | null;
  position: Point;
  provenance: string;
  temperature: number | null;
  packet_loss: number | null;
}
export interface Alert {
  id: string;
  severity: string;
  timestamp: string;
  type: string;
  message: string;
  track_id: string | null;
  sensor_id: string | null;
  zone_id: string | null;
  acknowledged: boolean;
  muted: boolean;
}
export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
}
export interface EventItem {
  id: string;
  timestamp: string;
  type: string;
  track_id: string | null;
  data: Record<string, unknown>;
}
export interface Sample {
  time: string;
  tracks: number;
  detections: number;
  confidence: number;
  latency: number;
  cpu?: number;
  alerts: number;
}
export interface Analytics {
  detections: number;
  active_tracks: number;
  confidence: number;
  continuity: number;
  latency: number;
  sensor_uptime: number;
  inference_ms: number;
  tracking_ms: number;
  inference_fps: number | null;
  dropped_frames: number | null;
  association_accuracy: number | null;
  sensor_disagreement: number;
  distribution: Record<ObjectClass, number>;
  alerts: number;
  history: Sample[];
  provenance: string;
}
export interface SimState {
  running: boolean;
  scenario: string;
  speed: number;
  elapsed: number;
  mode: string;
}
export interface System {
  cpu: number;
  memory: number;
  gpu: number | null;
  uptime: number;
  websocket_clients: number;
  database: boolean;
  redis: boolean;
  network_bytes: number;
}
export interface Snapshot {
  tracks: Track[];
  detections: Detection[];
  sensors: Sensor[];
  alerts: Alert[];
  zones: Zone[];
  analytics: Analytics;
  simulation: SimState;
  system: System;
  timestamp: string;
}
export const colors: Record<ObjectClass, string> = {
  Person: "#33e7ae",
  Vehicle: "#3aa6ff",
  Animal: "#fbbf65",
  Unknown: "#bd83ff",
};
