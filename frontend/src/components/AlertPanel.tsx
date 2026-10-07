import { useState } from "react";
import { alertStore, mapStore, authStore } from "../stores";
import { post } from "../services/api";
import { StatusBadge, timeLabel } from "./Common";
import { Button } from "./ui/button";
export function AlertPanel({ limit = 5 }: { limit?: number }) {
  const alerts = alertStore((s) => s.items);
  const role = authStore((s) => s.role);
  const select = mapStore((s) => s.select);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  async function action(id: string, verb: string) {
    try {
      await post("/alerts/" + id + "/" + verb);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="alerts">
      <div className="filter-line">
        <label>
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />{" "}
          Include reviewed
        </label>
        <span>
          {alerts.filter((a) => !a.acknowledged && !a.muted).length} active
        </span>
      </div>
      {error && <p className="error">{error}</p>}
      {alerts
        .filter((a) => all || (!a.acknowledged && !a.muted))
        .slice(0, limit)
        .map((a) => (
          <div key={a.id} className={"alert " + a.severity.toLowerCase()}>
            <div className="between">
              <StatusBadge value={a.severity} />
              <small>{timeLabel(a.timestamp)}</small>
            </div>
            <button
              className="alert-text"
              onClick={() => {
                select(a.track_id);
                action(a.id, "investigate");
              }}
            >
              {a.message}
            </button>
            <div className="between">
              <small>{a.zone_id || a.sensor_id || a.track_id}</small>
              {["ADMIN", "OPERATOR", "DEMO"].includes(role) && (
                <div>
                  <Button
                    title="Acknowledge"
                    onClick={() => action(a.id, "acknowledge")}
                  >
                    Ack
                  </Button>
                  <Button onClick={() => action(a.id, "mute")}>Mute</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      {!alerts.length && <div className="empty">No alerts</div>}
    </div>
  );
}
