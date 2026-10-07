import { create } from "zustand";
import type {
  Track,
  Detection,
  Sensor,
  Alert,
  Zone,
  Analytics,
  SimState,
  System,
  Snapshot,
} from "../types/domain";
export const authStore = create<{
  token: string;
  role: string;
  username: string;
  set: (v: { access_token: string; role: string; username: string }) => void;
  logout: () => void;
}>((set) => ({
  token: sessionStorage.getItem("scc_token") || "",
  role: sessionStorage.getItem("scc_role") || "",
  username: sessionStorage.getItem("scc_user") || "",
  set: (v) => {
    sessionStorage.setItem("scc_token", v.access_token);
    sessionStorage.setItem("scc_role", v.role);
    sessionStorage.setItem("scc_user", v.username);
    set({ token: v.access_token, role: v.role, username: v.username });
  },
  logout: () => {
    sessionStorage.clear();
    set({ token: "", role: "", username: "" });
  },
}));
export const sensorStore = create<{ items: Sensor[] }>(() => ({ items: [] }));
export const trackStore = create<{ items: Track[] }>(() => ({ items: [] }));
export const detectionStore = create<{ items: Detection[] }>(() => ({
  items: [],
}));
export const alertStore = create<{ items: Alert[] }>(() => ({ items: [] }));
export const simulationStore = create<{ data: SimState | null }>(() => ({
  data: null,
}));
export const systemStore = create<{
  data: System | null;
  analytics: Analytics | null;
  timestamp: string;
  connection: string;
}>(() => ({
  data: null,
  analytics: null,
  timestamp: "",
  connection: "CONNECTING",
}));
export const mapStore = create<{
  zones: Zone[];
  selected: string | null;
  playback: string | null;
  layers: Record<string, boolean>;
  select: (id: string | null) => void;
  setPlayback: (at: string | null) => void;
  toggle: (layer: string) => void;
}>((set) => ({
  zones: [],
  selected: null,
  playback: null,
  layers: {
    Sensors: true,
    Tracks: true,
    Trajectories: true,
    Geofences: true,
    Coverage: true,
  },
  select: (id) => set({ selected: id }),
  setPlayback: (playback) => set({ playback }),
  toggle: (layer) =>
    set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
}));
export function applySnapshot(s: Snapshot) {
  sensorStore.setState({ items: s.sensors });
  trackStore.setState({ items: s.tracks });
  detectionStore.setState({ items: s.detections });
  alertStore.setState({ items: s.alerts });
  mapStore.setState({ zones: s.zones });
  simulationStore.setState({ data: s.simulation });
  systemStore.setState({
    data: s.system,
    analytics: s.analytics,
    timestamp: s.timestamp,
  });
}
