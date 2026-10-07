import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, download } from "../services/api";
import { authStore, systemStore, mapStore } from "../stores";
import { Panel, MetricCard } from "../components/Common";
import { Button } from "../components/ui/button";
interface Experiment {
  id: string;
  timestamp: string;
  data: {
    model_version: string;
    dataset: string;
    provenance: string;
    results: { confidence: number; active_tracks: number };
  };
}
export function Research() {
  const metrics = systemStore((s) => s.analytics);
  const client = useQueryClient();
  const [model, setModel] = useState("mock-scene-v1");
  const [dataset, setDataset] = useState("procedural-demo");
  const [params, setParams] = useState('{"association_gate_m":18}');
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("missed_detection");
  const [message, setMessage] = useState("");
  const { data = [], error } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => api<Experiment[]>("/research/experiments"),
  });
  async function save() {
    try {
      await post("/research/experiments", {
        model_version: model,
        dataset,
        parameters: JSON.parse(params),
      });
      client.invalidateQueries({ queryKey: ["experiments"] });
      setMessage("Experiment snapshot saved");
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function exportData(format: string) {
    try {
      const r = await fetch("/api/research/export?format=" + format, {
        headers: { Authorization: "Bearer " + authStore.getState().token },
      });
      if (!r.ok) throw new Error("Export failed");
      download(
        "research." + format,
        await r.text(),
        format === "csv" ? "text/csv" : "application/json",
      );
    } catch (e) {
      setMessage(String(e));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Research workspace</h2>
          <p>
            Record model metadata, measured timings, and operator annotations.
            No unsupported accuracy claims.
          </p>
        </div>
        <div className="filters">
          <Button onClick={() => exportData("csv")}>Export CSV</Button>
          <Button onClick={() => exportData("json")}>Export JSON</Button>
        </div>
      </div>
      <div className="metrics-row large">
        <MetricCard
          label="Inference latency"
          value={
            metrics?.provenance === "SIMULATED"
              ? "N/A"
              : metrics?.inference_ms.toFixed(1) + " ms"
          }
          detail="Simulation has no pixel inference"
        />
        <MetricCard
          label="Tracking latency"
          value={metrics?.tracking_ms.toFixed(2) + " ms"}
        />
        <MetricCard
          label="Sensor disagreement"
          value={metrics?.sensor_disagreement.toFixed(2) + " m"}
        />
        <MetricCard
          label="Association accuracy"
          value="Not measured"
          detail="Ground-truth evaluation required"
        />
      </div>
      <div className="two-columns">
        <Panel title="Capture experiment">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              Model version
              <input
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>
            <label>
              Dataset
              <input
                required
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
              />
            </label>
            <label>
              Parameters (metadata only)
              <textarea
                rows={4}
                value={params}
                onChange={(e) => setParams(e.target.value)}
              />
            </label>
            <Button variant="primary">Save experiment snapshot</Button>
          </form>
        </Panel>
        <Panel title="Review annotation">
          <div className="form-grid">
            <label>
              Type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {[
                  "false_positive",
                  "missed_detection",
                  "correct_association",
                  "incorrect_association",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <Button
              onClick={async () => {
                try {
                  await post("/research/annotations", {
                    kind,
                    note,
                    track_id: mapStore.getState().selected,
                  });
                  setMessage("Annotation saved");
                } catch (e) {
                  setMessage(String(e));
                }
              }}
            >
              Save annotation
            </Button>
            <p className="notice">
              Selected track: {mapStore((s) => s.selected) || "none"}.
              Annotations are operator judgments, not automatic ground truth.
            </p>
          </div>
        </Panel>
      </div>
      {(message || error) && (
        <p className="notice">{message || String(error)}</p>
      )}
      <Panel title="Experiment sessions">
        <table>
          <thead>
            <tr>
              <th>Experiment</th>
              <th>Model</th>
              <th>Dataset</th>
              <th>Provenance</th>
              <th>Active tracks</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td>{e.data.model_version}</td>
                <td>{e.data.dataset}</td>
                <td>{e.data.provenance}</td>
                <td>{e.data.results.active_tracks}</td>
                <td>{(e.data.results.confidence * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
