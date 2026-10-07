import { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { simulationStore, authStore, mapStore } from "../stores";
import { post } from "../services/api";
import { Button } from "./ui/button";
export const scenarios = [
  ["normal", "Normal monitoring"],
  ["multiple", "Multiple moving objects"],
  ["failure", "Sensor failure"],
  ["unknown", "Persistent unknown"],
  ["fusion", "Multi-sensor detection"],
  ["dense", "High-density environment"],
];
export function SimulationControls() {
  const sim = simulationStore((s) => s.data);
  const role = authStore((s) => s.role);
  const [scenario, setScenario] = useState("normal");
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const can = ["ADMIN", "OPERATOR", "DEMO"].includes(role);
  async function action(a: string) {
    try {
      await post("/simulation/" + a, { scenario, speed });
      mapStore.getState().setPlayback(null);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="simulation-controls">
      <span className="provenance">
        {sim?.mode || "SIMULATED"} <b>{sim?.running ? "LIVE" : "PAUSED"}</b>
      </span>
      <select
        aria-label="Scenario"
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
      >
        {scenarios.map(([v, l]) => (
          <option value={v} key={v}>
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="Simulation speed"
        value={speed}
        onChange={(e) => setSpeed(+e.target.value)}
      >
        {[0.5, 1, 2, 5].map((v) => (
          <option key={v} value={v}>
            {v}×
          </option>
        ))}
      </select>
      <Button disabled={!can} variant="primary" onClick={() => action("start")}>
        <Play size={12} />
        Start
      </Button>
      <Button disabled={!can} onClick={() => action("stop")}>
        <Pause size={12} />
      </Button>
      <Button disabled={!can} onClick={() => action("reset")}>
        <RotateCcw size={12} />
      </Button>
      <small>{sim?.elapsed.toFixed(0)} s</small>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
