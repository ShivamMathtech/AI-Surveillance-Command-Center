import { useQuery } from "@tanstack/react-query";
import { api, download } from "../services/api";
import type { EventItem } from "../types/domain";
import { Panel, timeLabel } from "../components/Common";
import { Button } from "../components/ui/button";
import { mapStore } from "../stores";
export function Reports() {
  const { data = [], error } = useQuery({
    queryKey: ["events"],
    queryFn: () => api<EventItem[]>("/events"),
    refetchInterval: 5000,
  });
  return (
    <Panel
      title="Event & audit report"
      tools={
        <Button
          onClick={() => download("events.json", JSON.stringify(data, null, 2))}
        >
          Export JSON
        </Button>
      }
    >
      <p className="description">
        Latest 200 persisted events. Click an event timestamp to synchronize
        available detection history.
      </p>
      {error && <p>{String(error)}</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Track</th>
              <th>Context</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <td>
                  <button
                    onClick={() => {
                      mapStore.getState().setPlayback(e.timestamp);
                      mapStore.getState().select(e.track_id);
                    }}
                  >
                    {timeLabel(e.timestamp)}
                  </button>
                </td>
                <td>{e.type}</td>
                <td>{e.track_id || "—"}</td>
                <td>
                  {String(e.data.message || e.data.action || "Event recorded")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
