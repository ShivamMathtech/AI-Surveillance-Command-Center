// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { StatusBadge, Modal } from "./Common";
import { reconnectDelay } from "../hooks/useLive";
import { mapStore } from "../stores";
afterEach(cleanup);
describe("operator interface", () => {
  it("shows a labeled sensor state", () => {
    render(<StatusBadge value="OFFLINE" />);
    expect(screen.getByText("OFFLINE").className).toContain("offline");
  });
  it("opens an accessible detail dialog", () => {
    render(
      <Modal title="Sensor details" open onClose={() => {}}>
        <p>Latency 40 ms</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Latency 40 ms")).toBeTruthy();
  });
  it("shares selection and playback across spatial views", () => {
    mapStore.getState().select("T-0042");
    mapStore.getState().setPlayback("2026-01-01T00:00:00Z");
    expect(mapStore.getState().selected).toBe("T-0042");
    expect(mapStore.getState().playback).toContain("2026");
    mapStore.getState().setPlayback(null);
    expect(mapStore.getState().selected).toBe("T-0042");
  });
  it("bounds websocket exponential reconnect delay", () => {
    expect(reconnectDelay(0)).toBe(500);
    expect(reconnectDelay(3)).toBe(4000);
    expect(reconnectDelay(100)).toBe(15000);
  });
});
