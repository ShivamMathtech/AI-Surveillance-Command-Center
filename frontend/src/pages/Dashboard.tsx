import { sensorStore, trackStore, systemStore, mapStore } from "../stores";
import { Panel, MetricCard, StatusBadge } from "../components/Common";
import { LiveFeed } from "../components/LiveFeed";
import { lazy, Suspense } from "react";
const MapView = lazy(() =>
  import("../components/MapView").then((m) => ({ default: m.MapView })),
);
const ThreeDView = lazy(() =>
  import("../components/ThreeDView").then((m) => ({ default: m.ThreeDView })),
);
import { ErrorBoundary } from "../components/Common";
import { AlertPanel } from "../components/AlertPanel";
import { TrackDetail } from "../components/TrackDetail";
import { AnalyticsChart } from "../components/AnalyticsChart";
import { colors } from "../types/domain";
import { useScene } from "../hooks/useTracks";
export function CameraGrid() {
  const sensors = sensorStore((s) => s.items);
  return (
    <div className="camera-grid">
      {sensors
        .filter((s) => ["EO", "IR", "LOW_LIGHT", "ZOOM"].includes(s.type))
        .slice(0, 4)
        .map((s) => (
          <LiveFeed key={s.id} sensor={s} />
        ))}
    </div>
  );
}
export function DetectionCards() {
  const { tracks } = useScene();
  const select = mapStore((s) => s.select);
  const selected = mapStore((s) => s.selected);
  return (
    <div className="detections">
      <div className="class-totals">
        {Object.entries(colors).map(([c, color]) => (
          <div key={c} style={{ color }}>
            <span>{c}</span>
            <strong>
              {tracks
                .filter((t) => t.class_name === c && t.status !== "ENDED")
                .length.toString()
                .padStart(2, "0")}
            </strong>
          </div>
        ))}
      </div>
      <div className="detection-list">
        {tracks
          .filter((t) => t.status !== "ENDED")
          .slice(0, 60)
          .map((t) => (
            <button
              className={
                "detection-card " + (selected === t.id ? "selected" : "")
              }
              key={t.id}
              onClick={() => select(t.id)}
            >
              <div
                className="object-icon"
                style={{ color: colors[t.class_name] }}
              >
                {t.class_name === "Vehicle"
                  ? "▰"
                  : t.class_name === "Person"
                    ? "◉"
                    : t.class_name === "Animal"
                      ? "♧"
                      : "?"}
              </div>
              <div>
                <strong>{t.id}</strong>
                <span style={{ color: colors[t.class_name] }}>
                  {t.class_name}
                </span>
                <small>Confidence {(t.confidence * 100).toFixed(0)}%</small>
              </div>
              <StatusBadge value={t.status} />
            </button>
          ))}
      </div>
    </div>
  );
}
export function SensorStatus() {
  const sensors = sensorStore((s) => s.items);
  return (
    <div className="sensor-status">
      {sensors.map((s) => (
        <div key={s.id}>
          <i className={s.status === "ONLINE" ? "dot" : "dot red"} />
          <span>{s.name}</span>
          <small>{s.latency} ms</small>
          <StatusBadge value={s.status} />
        </div>
      ))}
    </div>
  );
}
export function Dashboard() {
  const analytics = systemStore((s) => s.analytics);
  return (
    <>
      <div className="dashboard-grid">
        <div className="primary-column">
          <div className="upper-grid">
            <Panel
              title="Live sensor feeds"
              tools={
                <span className="live-label">
                  <i className="dot" /> FOUR CHANNELS
                </span>
              }
            >
              <CameraGrid />
            </Panel>
            <Panel title="AI detections">
              <DetectionCards />
            </Panel>
          </div>
          <div className="spatial-grid">
            <Panel
              title="2D situational map"
              tools={<span className="badge">LOCAL GRID</span>}
            >
              <ErrorBoundary label="Map">
                <Suspense fallback={<div className="empty">Loading map…</div>}>
                  <MapView />
                </Suspense>
              </ErrorBoundary>
            </Panel>
            <Panel
              title="3D situational view"
              tools={<span className="badge">INTERACTIVE</span>}
            >
              <ErrorBoundary label="3D view">
                <Suspense
                  fallback={<div className="empty">Loading 3D scene…</div>}
                >
                  <ThreeDView />
                </Suspense>
              </ErrorBoundary>
            </Panel>
          </div>
          <div className="bottom-grid">
            <Panel title="Operational overview">
              <div className="metrics-row">
                <MetricCard
                  label="Active tracks"
                  value={analytics?.active_tracks ?? 0}
                  detail="Unified observations"
                />
                <MetricCard
                  label="Confidence"
                  value={((analytics?.confidence || 0) * 100).toFixed(0) + "%"}
                  detail="Model score · not accuracy"
                />
                <MetricCard
                  label="Continuity"
                  value={((analytics?.continuity || 0) * 100).toFixed(0) + "%"}
                  detail="Current visible ratio"
                />
              </div>
            </Panel>
            <Panel
              title="Track activity"
              tools={<small>ROLLING SESSION</small>}
            >
              <AnalyticsChart data={analytics?.history || []} />
            </Panel>
          </div>
        </div>
        <aside className="right-column">
          <Panel
            title="Active alerts"
            tools={<span className="badge high">REVIEW</span>}
          >
            <AlertPanel />
          </Panel>
          <Panel title="Sensor status">
            <SensorStatus />
          </Panel>
          <TrackDetail />
        </aside>
      </div>
    </>
  );
}
