import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { authStore, mapStore } from "./stores";
import { post } from "./services/api";
import { useLive } from "./hooks/useLive";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Dashboard, CameraGrid, DetectionCards } from "./pages/Dashboard";
import { Tracks } from "./pages/Tracks";
import { Sensors } from "./pages/Sensors";
import { Analytics } from "./pages/Analytics";
import { Research } from "./pages/Research";
import { Settings } from "./pages/Settings";
import { Reports } from "./pages/Reports";
import { SimulationControls, scenarios } from "./components/SimulationControls";
import { Panel, ErrorBoundary } from "./components/Common";
import { lazy, Suspense } from "react";
const MapView = lazy(() =>
  import("./components/MapView").then((m) => ({ default: m.MapView })),
);
const ThreeDView = lazy(() =>
  import("./components/ThreeDView").then((m) => ({ default: m.ThreeDView })),
);
import { TrackDetail } from "./components/TrackDetail";
import { AlertPanel } from "./components/AlertPanel";
import { Button } from "./components/ui/button";
import { useScene } from "./hooks/useTracks";
interface AuthResult {
  access_token: string;
  role: string;
  username: string;
}
function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function sign(demo = false) {
    try {
      const result = await post<AuthResult>(
        demo ? "/auth/demo" : "/auth/login",
        demo ? {} : { username, password },
      );
      authStore.getState().set(result);
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="login">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sign();
        }}
      >
        <Shield size={44} />
        <h1>
          AI SURVEILLANCE
          <br />
          COMMAND CENTER
        </h1>
        <p>Operator authentication</p>
        <label>
          Username
          <input
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button variant="primary">Sign in</Button>
        <Button type="button" onClick={() => sign(true)}>
          Open simulation demo
        </Button>
        {error && <p className="error">{error}</p>}
        <small>Generated administrator password: see README setup.</small>
      </form>
    </div>
  );
}
function PlaybackBar() {
  const at = mapStore((s) => s.playback);
  const set = mapStore((s) => s.setPlayback);
  const [value, setValue] = useState("");
  const { loading, error } = useScene();
  return (
    <div className={"playback-bar " + (at ? "historical" : "")}>
      <span>{at ? "HISTORICAL RECONSTRUCTION" : "LIVE OBSERVATIONS"}</span>
      <input
        aria-label="Playback timestamp"
        type="datetime-local"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={!value}
        onClick={() => set(new Date(value).toISOString())}
      >
        Load history
      </Button>
      {at && (
        <>
          <Button variant="primary" onClick={() => set(null)}>
            Return to live
          </Button>
          <small>
            {loading
              ? "Loading…"
              : error
                ? String(error)
                : new Date(at).toLocaleString() + " · No raw video retained"}
          </small>
        </>
      )}
    </div>
  );
}
export default function App() {
  const token = authStore((s) => s.token);
  const [page, setPage] = useState("Home");
  useLive();
  useEffect(() => {
    if (!token && !sessionStorage.getItem("scc_attempted")) {
      sessionStorage.setItem("scc_attempted", "1");
      post<AuthResult>("/auth/demo")
        .then((v) => authStore.getState().set(v))
        .catch(() => {});
    }
  }, []);
  if (!token) return <Login />;
  let content;
  switch (page) {
    case "Home":
      content = <Dashboard />;
      break;
    case "Live View":
      content = (
        <div className="detail-layout">
          <Panel title="Live sensor feeds">
            <CameraGrid />
          </Panel>
          <Panel title="AI detections">
            <DetectionCards />
          </Panel>
        </div>
      );
      break;
    case "Map":
    case "3D View":
      content = (
        <div className="detail-layout spatial-page">
          <Panel
            title={
              page === "Map"
                ? "2D situational map"
                : "3D situational environment"
            }
          >
            <ErrorBoundary label={page}>
              <Suspense
                fallback={<div className="empty">Loading spatial view…</div>}
              >
                {page === "Map" ? <MapView /> : <ThreeDView />}
              </Suspense>
            </ErrorBoundary>
          </Panel>
          <TrackDetail />
        </div>
      );
      break;
    case "Tracks":
      content = <Tracks />;
      break;
    case "Alerts":
      content = (
        <div className="detail-layout">
          <Panel title="Alert management">
            <AlertPanel limit={100} />
          </Panel>
          <TrackDetail />
        </div>
      );
      break;
    case "Analytics":
      content = <Analytics />;
      break;
    case "Sensors":
      content = <Sensors />;
      break;
    case "Research":
      content = <Research />;
      break;
    case "Reports":
      content = <Reports />;
      break;
    case "Settings":
      content = <Settings />;
      break;
    case "Simulation":
      content = (
        <>
          <Panel title="Simulation laboratory">
            <div className="scenario-grid">
              {scenarios.map(([id, name]) => (
                <div className="scenario-card" key={id}>
                  <span>SCENARIO {id.toUpperCase()}</span>
                  <h3>{name}</h3>
                  <p>
                    {id === "failure"
                      ? "IR observations stop after 9 seconds; recovery repeats every 30 seconds."
                      : id === "dense"
                        ? "70 independently moving objects exercise rendering and association."
                        : id === "fusion"
                          ? "Multiple sensors observe the same objects in local coordinates."
                          : id === "unknown"
                            ? "Persistent unknown classifications generate review alerts."
                            : "Generated objects move across the monitoring zone with occasional occlusion."}
                  </p>
                  <Button
                    onClick={() =>
                      post("/simulation/start", {
                        scenario: id,
                        speed: 1,
                      }).catch((e) => window.alert(String(e)))
                    }
                  >
                    Run scenario
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
          <Dashboard />
        </>
      );
      break;
    default:
      content = <Dashboard />;
  }
  return (
    <DashboardLayout page={page} setPage={setPage}>
      <SimulationControls />
      <PlaybackBar />
      <ErrorBoundary key={page} label={page}>
        {content}
      </ErrorBoundary>
    </DashboardLayout>
  );
}
