import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { mapStore, sensorStore } from "../stores";
import { Panel, StatusBadge, timeLabel } from "../components/Common";
import { TrackDetail } from "../components/TrackDetail";
import type { Track } from "../types/domain";
import { Button } from "../components/ui/button";
export function Tracks() {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [status, setStatus] = useState("");
  const [sensor, setSensor] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [minutes, setMinutes] = useState(60);
  const [offset, setOffset] = useState(0);
  const sensors = sensorStore((s) => s.items);
  const select = mapStore((s) => s.select);
  const {
    data = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ["tracks", q, cls, status, sensor, confidence, minutes, offset],
    queryFn: () =>
      api<Track[]>(
        "/tracks?" +
          new URLSearchParams({
            q,
            class_name: cls,
            status,
            sensor,
            confidence: String(confidence),
            since: new Date(Date.now() - minutes * 60000).toISOString(),
            limit: "100",
            offset: String(offset),
          }),
      ),
    refetchInterval: 3000,
  });
  return (
    <div className="detail-layout">
      <Panel
        title="Track registry"
        tools={
          <small>{isFetching ? "Updating…" : data.length + " records"}</small>
        }
      >
        <div className="filters">
          <input
            placeholder="Search track ID"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
          />
          <select value={cls} onChange={(e) => setCls(e.target.value)}>
            <option value="">All classes</option>
            {["Person", "Vehicle", "Animal", "Unknown"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All states</option>
            {["NEW", "ACTIVE", "LOST", "REACQUIRED", "ENDED"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select value={sensor} onChange={(e) => setSensor(e.target.value)}>
            <option value="">All sensors</option>
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={confidence}
            onChange={(e) => setConfidence(+e.target.value)}
          >
            <option value="0">Any confidence</option>
            <option value=".8">≥80%</option>
            <option value=".9">≥90%</option>
          </select>
          <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
            {[5, 15, 60, 360, 1440, 10080].map((v) => (
              <option value={v} key={v}>
                {v < 60 ? v + " min" : v / 60 + " hours"}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error">{String(error)}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Track",
                  "Class",
                  "Confidence",
                  "Status",
                  "First seen",
                  "Last seen",
                  "Sources",
                  "Position",
                  "Direction",
                  "Speed",
                  "Duration",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => select(t.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && select(t.id)}
                >
                  <td>{t.id}</td>
                  <td>{t.class_name}</td>
                  <td>{(t.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <StatusBadge value={t.status} />
                  </td>
                  <td>{timeLabel(t.first_seen)}</td>
                  <td>{timeLabel(t.last_seen)}</td>
                  <td>{t.sensor_sources.join(", ")}</td>
                  <td>
                    {t.position
                      ? `${t.position.x.toFixed(0)}, ${t.position.y.toFixed(0)} m`
                      : "Image only"}
                  </td>
                  <td>{t.direction.toFixed(0)}°</td>
                  <td>
                    {t.speed === null
                      ? "—"
                      : (t.speed * 3.6).toFixed(1) + " km/h"}
                  </td>
                  <td>
                    {Math.round(
                      (Date.parse(t.last_seen) - Date.parse(t.first_seen)) /
                        1000,
                    )}{" "}
                    s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="filters">
          <Button
            disabled={offset === 0}
            onClick={() => setOffset((v) => Math.max(0, v - 100))}
          >
            Previous
          </Button>
          <span>Page {offset / 100 + 1}</span>
          <Button
            disabled={data.length < 100}
            onClick={() => setOffset((v) => v + 100)}
          >
            Next
          </Button>
        </div>
      </Panel>
      <TrackDetail />
    </div>
  );
}
