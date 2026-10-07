import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useScene } from "../hooks/useTracks";
import { mapStore, sensorStore } from "../stores";
import { Button } from "./ui/button";
const origin: [number, number] = [78.0322, 30.3165];
const world = (x: number, y: number): [number, number] => [
  origin[0] + x / (111320 * Math.cos((origin[1] * Math.PI) / 180)),
  origin[1] + y / 111320,
];
const point = (coordinates: number[], properties: Record<string, unknown>) => ({
  type: "Feature" as const,
  geometry: { type: "Point" as const, coordinates },
  properties,
});
export function MapView() {
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map>();
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const { tracks } = useScene();
  const sensors = sensorStore((s) => s.items);
  const zones = mapStore((s) => s.zones);
  const selected = mapStore((s) => s.selected);
  const layers = mapStore((s) => s.layers);
  const toggle = mapStore((s) => s.toggle);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    try {
      const m = new maplibregl.Map({
        container: root.current!,
        center: origin,
        zoom: 16.8,
        pitch: 0,
        attributionControl: false,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#0a1a24" },
            },
          ],
        },
      });
      map.current = m;
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "top-right",
      );
      m.on("load", () => {
        setReady(true);
      });
      m.on("error", () => setError("Map layer unavailable"));
      m.on("click", "tracks", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) mapStore.getState().select(id);
      });
      return () => {
        markers.current.forEach((marker) => marker.remove());
        markers.current.clear();
        m.remove();
      };
    } catch {
      setError("MAP SERVICE UNAVAILABLE — WebGL required");
    }
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const features: GeoJSON.Feature[] = [];
    for (let x = -400; x <= 400; x += 40)
      features.push(
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [world(x, -400), world(x, 400)],
          },
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [world(-400, x), world(400, x)],
          },
        },
      );
    const data: Record<string, GeoJSON.FeatureCollection> = {
      grid: { type: "FeatureCollection", features },
      tracks: {
        type: "FeatureCollection",
        features: tracks
          .filter((t) => t.position)
          .map((t) =>
            point(world(t.position!.x, t.position!.y), {
              id: t.id,
              class: t.class_name,
              selected: t.id === selected,
            }),
          ),
      },
      sensors: {
        type: "FeatureCollection",
        features: sensors.map((s) =>
          point(world(s.position.x, s.position.y), { id: s.id }),
        ),
      },
      paths: {
        type: "FeatureCollection",
        features: tracks
          .filter((t) => t.position && t.trajectory.length > 1)
          .map((t) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: t.trajectory.map((p) => world(p.x, p.y)),
            },
          })),
      },
      zones: {
        type: "FeatureCollection",
        features: zones.map((z) => ({
          type: "Feature",
          properties: { name: z.name },
          geometry: {
            type: "Polygon",
            coordinates: [
              Array.from({ length: 65 }, (_, i) =>
                world(
                  z.x + Math.cos((i / 64) * Math.PI * 2) * z.radius,
                  z.y + Math.sin((i / 64) * Math.PI * 2) * z.radius,
                ),
              ),
            ],
          },
        })),
      },
      coverage: {
        type: "FeatureCollection",
        features: sensors
          .slice(0, 4)
          .map((s, i) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  world(s.position.x, s.position.y),
                  world(
                    s.position.x + Math.cos(i * 1.5 - 0.5) * 130,
                    s.position.y + Math.sin(i * 1.5 - 0.5) * 130,
                  ),
                  world(
                    s.position.x + Math.cos(i * 1.5 + 0.5) * 130,
                    s.position.y + Math.sin(i * 1.5 + 0.5) * 130,
                  ),
                  world(s.position.x, s.position.y),
                ],
              ],
            },
          })),
      },
    };
    for (const [id, value] of Object.entries(data)) {
      const source = m.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(value);
      else m.addSource(id, { type: "geojson", data: value });
    }
    if (!m.getLayer("grid")) {
      m.addLayer({
        id: "grid",
        type: "line",
        source: "grid",
        paint: { "line-color": "#163340", "line-width": 1 },
      });
      m.addLayer({
        id: "zones",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": "#f97a62",
          "fill-opacity": 0.12,
          "fill-outline-color": "#f97a62",
        },
      });
      m.addLayer({
        id: "coverage",
        type: "fill",
        source: "coverage",
        paint: {
          "fill-color": "#178dc6",
          "fill-opacity": 0.12,
          "fill-outline-color": "#168dc6",
        },
      });
      m.addLayer({
        id: "paths",
        type: "line",
        source: "paths",
        paint: { "line-color": "#287b95", "line-width": 1.5 },
      });
      m.addLayer({
        id: "sensors",
        type: "circle",
        source: "sensors",
        paint: {
          "circle-radius": 6,
          "circle-color": "#0b2c46",
          "circle-stroke-color": "#66ccff",
          "circle-stroke-width": 2,
        },
      });
      m.addLayer({
        id: "tracks",
        type: "circle",
        source: "tracks",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 8, 5],
          "circle-color": [
            "match",
            ["get", "class"],
            "Vehicle",
            "#3aa6ff",
            "Person",
            "#33e7ae",
            "Animal",
            "#fbbf65",
            "#bd83ff",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#e0ffff",
        },
      });
    }
    const visible = new Set(
      tracks.filter((t) => t.position && layers.Tracks).map((t) => t.id),
    );
    for (const [id, marker] of markers.current)
      if (!visible.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    for (const t of tracks) {
      if (!t.position || !layers.Tracks) continue;
      let marker = markers.current.get(t.id);
      if (!marker) {
        const label = document.createElement("button");
        label.className = "map-track-label";
        label.textContent = t.id;
        label.onclick = () => mapStore.getState().select(t.id);
        marker = new maplibregl.Marker({
          element: label,
          anchor: "bottom-left",
          offset: [7, -5],
        })
          .setLngLat(world(t.position.x, t.position.y))
          .addTo(m);
        markers.current.set(t.id, marker);
      }
      marker.setLngLat(world(t.position.x, t.position.y));
      marker.getElement().classList.toggle("chosen", t.id === selected);
    }
    for (const [label, id] of Object.entries({
      Sensors: "sensors",
      Tracks: "tracks",
      Trajectories: "paths",
      Geofences: "zones",
      Coverage: "coverage",
    }))
      m.setLayoutProperty(id, "visibility", layers[label] ? "visible" : "none");
  }, [ready, tracks, sensors, zones, selected, layers]);
  return (
    <div className="map-wrap">
      <div ref={root} className="map" />
      {error && <div className="map-caption">{error}</div>}
      <div className="map-buttons">
        <Button
          onClick={() =>
            map.current?.flyTo({
              center: origin,
              zoom: 16.8,
              pitch: 0,
              bearing: 0,
            })
          }
        >
          Reset
        </Button>
        <Button onClick={() => setMenu((v) => !v)}>Layers</Button>
      </div>
      {menu && (
        <div className="layer-menu">
          {Object.entries(layers).map(([k, v]) => (
            <label key={k}>
              <input type="checkbox" checked={v} onChange={() => toggle(k)} />
              {k}
            </label>
          ))}
        </div>
      )}
      <div className="map-caption">
        LOCAL GRID · ESTIMATED GEOREFERENCE · 30.3165° N, 78.0322° E
      </div>
    </div>
  );
}
