import { useEffect } from "react";
import { authStore, applySnapshot, systemStore } from "../stores";
import { api } from "../services/api";
import type { Snapshot } from "../types/domain";
export const reconnectDelay = (attempt: number) =>
  Math.min(15000, 500 * 2 ** Math.min(attempt, 5));
export function useLive() {
  const token = authStore((s) => s.token);
  useEffect(() => {
    if (!token) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let socket: WebSocket;
    let attempt = 0;
    let lastMessage = Date.now();
    api<Snapshot>("/live")
      .then(applySnapshot)
      .catch(() => {});
    const connect = () => {
      if (stopped) return;
      systemStore.setState({ connection: "CONNECTING" });
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/live`,
      );
      socket.onopen = () => {
        socket.send(JSON.stringify({ token }));
        lastMessage = Date.now();
      };
      socket.onmessage = (e) => {
        lastMessage = Date.now();
        attempt = 0;
        systemStore.setState({ connection: "CONNECTED" });
        const m = JSON.parse(e.data);
        if (m.type === "snapshot" || m.type === "state") applySnapshot(m.data);
      };
      socket.onerror = () => socket.close();
      socket.onclose = (e) => {
        if (stopped) return;
        if (e.code === 4001) {
          authStore.getState().logout();
          return;
        }
        systemStore.setState({ connection: "RECONNECTING" });
        timer = setTimeout(connect, reconnectDelay(attempt++));
      };
    };
    connect();
    const watchdog = setInterval(() => {
      if (Date.now() - lastMessage > 25000) socket?.close();
    }, 5000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(watchdog);
      socket?.close();
    };
  }, [token]);
}
