import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Analytics as AnalyticsData } from "../types/domain";
import { Panel, MetricCard } from "../components/Common";
import { AnalyticsChart } from "../components/AnalyticsChart";
import { colors } from "../types/domain";
export function Analytics() {
  const [minutes, setMinutes] = useState(15);
  const { data, error } = useQuery({
    queryKey: ["analytics", minutes],
    queryFn: () => api<AnalyticsData>("/analytics?minutes=" + minutes),
    refetchInterval: 5000,
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Analytics & performance</h2>
          <p>
            Measured service telemetry with explicitly labeled simulation
            observations.
          </p>
        </div>
        <select value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
          {[
            [5, "5 min"],
            [15, "15 min"],
            [60, "1 hour"],
            [360, "6 hours"],
            [1440, "24 hours"],
            [10080, "7 days"],
          ].map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error">{String(error)}</p>}
      <div className="metrics-row large">
        <MetricCard
          label="Detections processed"
          value={data?.detections ?? 0}
        />
        <MetricCard label="Active tracks" value={data?.active_tracks ?? 0} />
        <MetricCard
          label="Mean confidence"
          value={((data?.confidence || 0) * 100).toFixed(1) + "%"}
          detail="Not validated accuracy"
        />
        <MetricCard
          label="Sensor availability"
          value={((data?.sensor_uptime || 0) * 100).toFixed(0) + "%"}
          detail="Current snapshot"
        />
        <MetricCard
          label="Average latency"
          value={(data?.latency || 0).toFixed(0) + " ms"}
        />
      </div>
      <div className="analytics-grid">
        {[
          ["Track trend", "tracks"],
          ["Detection trend (cumulative)", "detections"],
          ["Confidence trend", "confidence"],
          ["Sensor latency", "latency"],
          ["Alert activity", "alerts"],
        ].map(([title, field]) => (
          <Panel key={field} title={title}>
            <AnalyticsChart data={data?.history || []} field={field} />
          </Panel>
        ))}
        <Panel title="Object distribution">
          <div className="distribution">
            {data &&
              Object.entries(data.distribution).map(([name, count]) => (
                <div key={name}>
                  <span>{name}</span>
                  <div>
                    <i
                      style={{
                        width:
                          (count / Math.max(1, data.active_tracks)) * 100 + "%",
                        background: colors[name as keyof typeof colors],
                      }}
                    />
                  </div>
                  <b>{count}</b>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
