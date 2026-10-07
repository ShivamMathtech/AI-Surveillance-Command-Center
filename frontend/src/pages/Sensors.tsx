import { useState } from "react";
import { sensorStore, authStore } from "../stores";
import { api, post } from "../services/api";
import { Panel, Modal, StatusBadge, timeLabel } from "../components/Common";
import { Button } from "../components/ui/button";
import type { Sensor } from "../types/domain";
interface Config {
  name: string;
  type: string;
  protocol: string;
  endpoint: string;
  enabled: boolean;
}
const empty: Config = {
  name: "",
  type: "EO",
  protocol: "mock",
  endpoint: "",
  enabled: true,
};
export function Sensors() {
  const sensors = sensorStore((s) => s.items);
  const role = authStore((s) => s.role);
  const [selected, setSelected] = useState<Sensor | null>(null);
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState("");
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  async function edit(s?: Sensor) {
    try {
      setId(s?.id || "");
      setForm(s ? await api<Config>("/sensors/" + s.id + "/config") : empty);
      setEditing(true);
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function save() {
    try {
      if (id)
        await api("/sensors/" + id, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      else await post("/sensors", form);
      setEditing(false);
      setMessage("Sensor configuration saved");
    } catch (e) {
      setMessage(String(e));
    }
  }
  return (
    <>
      <Panel
        title="Sensor network"
        tools={
          role === "ADMIN" && (
            <Button variant="primary" onClick={() => edit()}>
              Add sensor
            </Button>
          )
        }
      >
        <p className="description">
          Adapter health and sensor diagnostics. Hardware measurements are shown
          only when available.
        </p>
        {message && <p className="notice">{message}</p>}
        <div className="sensor-grid">
          {sensors.map((s) => (
            <button
              key={s.id}
              className="sensor-card"
              onClick={() => setSelected(s)}
            >
              <div className="between">
                <strong>{s.name}</strong>
                <StatusBadge value={s.status} />
              </div>
              <span>
                {s.id} · {s.type}
              </span>
              <div className="sensor-stats">
                <div>
                  <b>{s.fps}</b>
                  <small>FPS</small>
                </div>
                <div>
                  <b>{s.latency} ms</b>
                  <small>LATENCY</small>
                </div>
                <div>
                  <b>{s.resolution}</b>
                  <small>RESOLUTION</small>
                </div>
              </div>
              <small>
                Updated {timeLabel(s.last_update)} · {s.provenance}
              </small>
            </button>
          ))}
        </div>
      </Panel>
      <Modal
        title={selected?.name + " diagnostics"}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <dl className="diagnostics">
              {Object.entries({
                Connection: selected.status,
                "Last update": timeLabel(selected.last_update),
                Latency: selected.latency + " ms",
                Temperature: selected.temperature ?? "Not reported",
                "Packet loss": selected.packet_loss ?? "Not reported",
                "CPU / memory": "Not reported by adapter",
                "Data rate": "Not reported by adapter",
                Provenance: selected.provenance,
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {role === "ADMIN" && (
              <div className="filters">
                <Button onClick={() => edit(selected)}>Edit / disable</Button>
                <Button
                  onClick={async () => {
                    try {
                      const result = await post(
                        "/sensors/" + selected.id + "/test",
                      );
                      setMessage(JSON.stringify(result));
                      setSelected(null);
                    } catch (e) {
                      setMessage(String(e));
                    }
                  }}
                >
                  Test connection
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
      <Modal
        title={id ? "Edit sensor" : "Add sensor"}
        open={editing}
        onClose={() => setEditing(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="form-grid"
        >
          <label>
            Name
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Sensor type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {[
                "EO",
                "IR",
                "LOW_LIGHT",
                "ZOOM",
                "RADAR",
                "LIDAR",
                "GPS",
                "IMU",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Protocol
            <select
              value={form.protocol}
              onChange={(e) => setForm({ ...form, protocol: e.target.value })}
            >
              {["mock", "file", "rtsp", "webrtc"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Endpoint
            <input
              value={form.endpoint}
              placeholder="/media/video.mp4 or allowlisted RTSP URL"
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />{" "}
            Enabled
          </label>
          <p className="notice">
            WebRTC requires a camera-specific signaling integration. File and
            RTSP run through the CPU HOG person detector.
          </p>
          <Button type="submit" variant="primary">
            Save configuration
          </Button>
          {message && <p>{message}</p>}
        </form>
      </Modal>
    </>
  );
}
