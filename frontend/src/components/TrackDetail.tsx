import { useQuery } from "@tanstack/react-query";
import { mapStore, trackStore } from "../stores";
import { api, post } from "../services/api";
import type { Track } from "../types/domain";
import { Panel, StatusBadge, timeLabel } from "./Common";
import { Button } from "./ui/button";
import { useState } from "react";
import { useScene } from "../hooks/useTracks";
export function TrackDetail() {
  const id = mapStore((s) => s.selected);
  const select = mapStore((s) => s.select);
  const setPlayback = mapStore((s) => s.setPlayback);
  const { tracks } = useScene();
  const live = tracks.find((t) => t.id === id);
  const { data } = useQuery({
    queryKey: ["track", id],
    queryFn: () => api<Track>("/tracks/" + id),
    enabled: !!id,
    refetchInterval: 5000,
  });
  const t = live || data;
  const [message, setMessage] = useState("");
  if (!id || !t)
    return (
      <Panel title="Track details">
        <div className="empty">
          Select a detection, map marker, or 3D object to inspect its track.
        </div>
      </Panel>
    );
  return (
    <Panel
      title={t.id}
      tools={<Button onClick={() => select(null)}>Close</Button>}
    >
      <div className="track-detail">
        <div className="between">
          <strong>{t.class_name}</strong>
          <StatusBadge value={t.status} />
        </div>
        <div className="provenance">
          {t.provenance} · {t.coordinate_space} COORDINATES
        </div>
        <dl>
          {Object.entries({
            Confidence: (t.confidence * 100).toFixed(1) + "%",
            "Speed (estimated)":
              t.speed === null
                ? "Unavailable"
                : (t.speed * 3.6).toFixed(1) + " km/h",
            Direction: t.direction.toFixed(1) + "°",
            "First seen": timeLabel(t.first_seen),
            "Last seen": timeLabel(t.last_seen),
            Duration:
              Math.round(
                (Date.parse(t.last_seen) - Date.parse(t.first_seen)) / 1000,
              ) + " s",
            Position: t.position
              ? `${t.position.x.toFixed(1)}, ${t.position.y.toFixed(1)} m`
              : "Uncalibrated image",
            Sources: t.sensor_sources.join(", "),
          }).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3>Event timeline</h3>
        <button
          className="timeline-item"
          onClick={() => setPlayback(t.first_seen)}
        >
          <i className="dot" />
          {timeLabel(t.first_seen)} · First detected
        </button>
        {data?.events?.slice(0, 8).map((e) => (
          <button
            className="timeline-item"
            key={e.id}
            onClick={() => setPlayback(e.timestamp)}
          >
            <i className="dot" />
            {timeLabel(e.timestamp)} · {e.type.replaceAll("_", " ")}
          </button>
        ))}
        <h3>Detection history</h3>
        {data?.detection_history?.slice(0, 6).map((d) => (
          <button
            key={d.detection_id}
            className="timeline-item"
            onClick={() =>
              setPlayback(new Date(d.timestamp * 1000).toISOString())
            }
          >
            {timeLabel(new Date(d.timestamp * 1000).toISOString())} ·{" "}
            {d.sensor_id} · {Math.round(d.confidence * 100)}%
          </button>
        ))}
        <Button
          onClick={async () => {
            try {
              await post("/research/annotations", {
                kind: "false_positive",
                track_id: t.id,
                note: "Operator review",
              });
              setMessage("Annotation saved");
            } catch (e) {
              setMessage(String(e));
            }
          }}
        >
          Annotate false positive
        </Button>
        <small>{message}</small>
      </div>
    </Panel>
  );
}
