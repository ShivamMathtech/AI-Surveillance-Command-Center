import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authStore, simulationStore } from "../stores";
import { api, post } from "../services/api";
import { Panel } from "../components/Common";
import { Button } from "../components/ui/button";
export function Settings() {
  const role = authStore((s) => s.role);
  const sim = simulationStore((s) => s.data);
  const [message, setMessage] = useState("");
  const [unknown, setUnknown] = useState(8);
  const [latency, setLatency] = useState(180);
  const [zone, setZone] = useState({
    name: "New monitoring zone",
    x: 0,
    y: 0,
    radius: 50,
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState("VIEWER");
  const { data: users = [], refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      api<{ username: string; role: string; enabled: boolean }[]>("/users"),
    enabled: role === "ADMIN",
  });
  return (
    <div className="two-columns">
      <Panel title="Operation settings">
        <div className="form-grid">
          <p>
            Current mode: <strong>{sim?.mode}</strong>
          </p>
          <p className="notice">
            Simulation uses generated observations. Real mode reads configured
            file / RTSP cameras. Geographic positions require calibrated
            measurement ingestion.
          </p>
          {role === "ADMIN" ? (
            <>
              <Button
                onClick={async () => {
                  try {
                    await post(
                      "/mode/" + (sim?.mode === "REAL" ? "SIMULATED" : "REAL"),
                    );
                    setMessage("Mode changed");
                  } catch (e) {
                    setMessage(String(e));
                  }
                }}
              >
                Switch to {sim?.mode === "REAL" ? "simulation" : "real sensor"}{" "}
                mode
              </Button>
              <p>
                RTSP hosts must be set in ALLOWED_RTSP_HOSTS. Video files must
                be mounted under /media. Endpoint credentials remain
                server-side.
              </p>
            </>
          ) : (
            <p>Administrator access required to change acquisition mode.</p>
          )}
          {role === "ADMIN" && (
            <>
              <h3>Alert thresholds</h3>
              <label>
                Unknown persists (seconds)
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={unknown}
                  onChange={(e) => setUnknown(+e.target.value)}
                />
              </label>
              <label>
                High latency (ms)
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={latency}
                  onChange={(e) => setLatency(+e.target.value)}
                />
              </label>
              <Button
                onClick={async () => {
                  try {
                    await api("/rules", {
                      method: "PUT",
                      body: JSON.stringify({
                        unknown_seconds: unknown,
                        latency_ms: latency,
                      }),
                    });
                    setMessage("Alert rules saved");
                  } catch (e) {
                    setMessage(String(e));
                  }
                }}
              >
                Save alert rules
              </Button>
              <h3>Add circular geofence</h3>
              <input
                aria-label="Zone name"
                value={zone.name}
                onChange={(e) => setZone({ ...zone, name: e.target.value })}
              />
              <div className="filters">
                {(["x", "y", "radius"] as const).map((k) => (
                  <label key={k}>
                    {k} (m)
                    <input
                      type="number"
                      value={zone[k]}
                      onChange={(e) =>
                        setZone({ ...zone, [k]: +e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <Button
                onClick={async () => {
                  try {
                    await post("/zones", zone);
                    setMessage("Geofence added");
                  } catch (e) {
                    setMessage(String(e));
                  }
                }}
              >
                Add geofence
              </Button>
            </>
          )}
          <p>{message}</p>
        </div>
      </Panel>
      <Panel title="User administration">
        {role === "ADMIN" ? (
          <>
            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await post("/users", { username, password, role: newRole });
                  setPassword("");
                  setUsername("");
                  refetch();
                  setMessage("User created");
                } catch (err) {
                  setMessage(String(err));
                }
              }}
            >
              <label>
                Username
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                Temporary password
                <input
                  required
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Role
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  {["VIEWER", "ANALYST", "OPERATOR", "ADMIN"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <Button variant="primary">Create user</Button>
            </form>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username}>
                    <td>{u.username}</td>
                    <td>{u.role}</td>
                    <td>{u.enabled ? "Enabled" : "Disabled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="empty">
            Your role: {role}. Only administrators can manage users.
          </div>
        )}
      </Panel>
    </div>
  );
}
