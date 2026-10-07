import type { ReactNode } from "react";
import {
  Shield,
  LayoutDashboard,
  Video,
  Map,
  Box,
  ScanLine,
  Bell,
  ChartNoAxesCombined,
  FileText,
  Radio,
  FlaskConical,
  Settings,
  LogOut,
} from "lucide-react";
import { authStore, systemStore, alertStore } from "../stores";
import { Button } from "../components/ui/button";
const items = [
  ["Home", LayoutDashboard],
  ["Live View", Video],
  ["Map", Map],
  ["3D View", Box],
  ["Tracks", ScanLine],
  ["Alerts", Bell],
  ["Analytics", ChartNoAxesCombined],
  ["Reports", FileText],
  ["Sensors", Radio],
  ["Simulation", FlaskConical],
  ["Research", FlaskConical],
  ["Settings", Settings],
] as const;
export function DashboardLayout({
  page,
  setPage,
  children,
}: {
  page: string;
  setPage: (p: string) => void;
  children: ReactNode;
}) {
  const system = systemStore((s) => s.data);
  const status = systemStore((s) => s.connection);
  const stamp = systemStore((s) => s.timestamp);
  const role = authStore((s) => s.role);
  const username = authStore((s) => s.username);
  const alerts = alertStore(
    (s) => s.items.filter((a) => !a.acknowledged && !a.muted).length,
  );
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Shield size={31} />
          <span>
            SCC<span>COMMAND CENTER</span>
          </span>
        </div>
        <nav>
          {items.map(([label, Icon]) => (
            <button
              key={label}
              className={page === label ? "active" : ""}
              onClick={() => setPage(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "Alerts" && alerts > 0 && <b>{alerts}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="radar-emblem">
            <Radio size={35} />
          </div>
          <strong>OBSERVATION NODE</strong>
          <span>
            <i className="dot" /> Defensive monitoring
          </span>
          <small>Research & situational awareness</small>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <div>
            <h1>
              AI SURVEILLANCE <span>COMMAND CENTER</span>
            </h1>
            <small>
              MULTI-SENSOR INTELLIGENCE <span className="slash">/</span>{" "}
              OPERATIONS CONSOLE
            </small>
          </div>
          <div className="top-metrics">
            <span>
              <i className={status === "CONNECTED" ? "dot" : "dot red"} />
              {status === "CONNECTED" ? "System online" : "Connecting"}
            </span>
            <span>
              CPU <b>{system?.cpu.toFixed(0) || "—"}%</b>
            </span>
            <span>
              RAM <b>{system?.memory.toFixed(0) || "—"}%</b>
            </span>
            <span>
              GPU <b>N/A</b>
            </span>
            <span className="clock">
              {stamp ? new Date(stamp).toLocaleTimeString("en-GB") : "—"}
              <small>
                {username} · {role}
              </small>
            </span>
            <Button
              title="Sign out"
              onClick={() => authStore.getState().logout()}
            >
              <LogOut size={15} />
            </Button>
          </div>
        </header>
        {status !== "CONNECTED" && (
          <div className="connection-banner">
            REAL-TIME CONNECTION LOST — RECONNECTING…
          </div>
        )}
        <main>{children}</main>
        <footer>
          <span>
            <i className="dot" /> SECURE OPERATOR SESSION
          </span>
          <span>
            SIMULATED / ESTIMATED / REAL provenance displayed at source
          </span>
          <span>SCC 1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
