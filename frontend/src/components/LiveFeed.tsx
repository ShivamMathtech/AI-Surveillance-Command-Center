import { memo, useEffect, useRef, useState } from "react";
import { Maximize, Camera, Plus, Minus, Video, Square } from "lucide-react";
import type { Sensor, Track } from "../types/domain";
import { colors } from "../types/domain";
import { mapStore, authStore } from "../stores";
import { useScene } from "../hooks/useTracks";
import { Button } from "./ui/button";
export const LiveFeed = memo(function LiveFeed({ sensor }: { sensor: Sensor }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const { tracks } = useScene();
  const scene = useRef<Track[]>(tracks);
  scene.current = tracks;
  const [zoom, setZoom] = useState(1);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const select = mapStore((s) => s.select);
  const playback = mapStore((s) => s.playback);
  useEffect(() => {
    if (sensor.provenance !== "REAL" || playback) return;
    let done = false;
    let url = "";
    let timeout: ReturnType<typeof setTimeout>;
    const fetchFrame = async () => {
      try {
        const r = await fetch("/api/video/" + sensor.id + "/frame", {
          headers: { Authorization: "Bearer " + authStore.getState().token },
        });
        if (!r.ok) throw new Error("Camera disconnected");
        const blob = await r.blob();
        if (done) return;
        URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        const im = new Image();
        im.src = url;
        await im.decode();
        imageRef.current = im;
        setError("");
      } catch {
        if (!done) setError("CAMERA DISCONNECTED");
      }
      if (!done) timeout = setTimeout(fetchFrame, 150);
    };
    fetchFrame();
    return () => {
      done = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
    };
  }, [sensor.id, sensor.provenance, playback]);
  useEffect(() => {
    let animation = 0;
    let previous = 0;
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    const render = (now: number) => {
      animation = requestAnimationFrame(render);
      if (now - previous < 80) return;
      previous = now;
      const w = (c.width = 640),
        h = (c.height = 360);
      ctx.fillStyle = "#08131f";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
      if (sensor.provenance === "REAL" && !playback) {
        if (imageRef.current) ctx.drawImage(imageRef.current, 0, 0, w, h);
      } else {
        const thermal = sensor.type === "IR",
          night = sensor.type === "LOW_LIGHT";
        ctx.filter = thermal
          ? "grayscale(1) contrast(1.7)"
          : night
            ? "grayscale(1) brightness(.55)"
            : "none";
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, night ? "#0d1926" : "#6897ac");
        sky.addColorStop(0.48, "#7b9686");
        sky.addColorStop(1, "#3c5242");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = ["#496c68", "#355955", "#2c4946"][j];
          ctx.beginPath();
          ctx.moveTo(0, 130 + j * 20);
          for (let x = 0; x <= w; x += 10)
            ctx.lineTo(
              x,
              115 +
                j * 18 +
                Math.sin(x * 0.016 + j) * 19 +
                Math.sin(x * 0.035) * 10,
            );
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.fill();
        }
        ctx.fillStyle = "#4e575c";
        ctx.beginPath();
        ctx.moveTo(288, 150);
        ctx.lineTo(332, 150);
        ctx.lineTo(545, 360);
        ctx.lineTo(80, 360);
        ctx.fill();
        ctx.strokeStyle = "#a4a889";
        ctx.setLineDash([12, 15]);
        ctx.beginPath();
        ctx.moveTo(310, 152);
        ctx.lineTo(320, 360);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 27; i++) {
          const x = (i * 83 + 14) % 640,
            y = 165 + ((i * 37) % 180);
          const bw = 17 + (y - 150) * 0.14;
          if (x > 280 - (y - 150) * 0.8 && x < 340 + (y - 150) * 0.8) continue;
          ctx.fillStyle = "#75816e";
          ctx.fillRect(x, y, bw, bw * 0.64);
          ctx.fillStyle = "#525e56";
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + bw / 2, y - 10);
          ctx.lineTo(x + bw + 3, y);
          ctx.fill();
          ctx.fillStyle = "#233b3e";
          ctx.fillRect(x + bw * 0.2, y + 4, 6, 7);
          ctx.fillRect(x + bw * 0.65, y + 4, 5, 7);
        }
        for (let i = 0; i < 32; i++) {
          const x = (i * 71) % 640,
            y = 150 + ((i * 23) % 210);
          if (x > 220 && x < 420) continue;
          ctx.fillStyle = "#254a3d";
          ctx.beginPath();
          ctx.ellipse(x, y, 8 + y / 35, 11 + y / 40, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.filter = "none";
      }
      for (const t of scene.current.filter(
        (t) => t.sensor_sources.includes(sensor.id) && t.status !== "ENDED",
      )) {
        const [bx, by, bw, bh] = t.bbox;
        const x = bx * w,
          y = by * h,
          ww = bw * w,
          hh = bh * h;
        if (sensor.provenance !== "REAL") {
          ctx.fillStyle =
            sensor.type === "IR"
              ? "#f3eee1"
              : t.class_name === "Vehicle"
                ? "#c1cbd0"
                : "#a8b298";
          if (t.class_name === "Vehicle") {
            ctx.fillRect(x + 3, y + hh * 0.35, ww - 6, hh * 0.5);
            ctx.fillStyle = "#21323a";
            ctx.fillRect(x + ww * 0.18, y + hh * 0.4, ww * 0.38, hh * 0.22);
          } else {
            ctx.beginPath();
            ctx.arc(x + ww / 2, y + hh * 0.18, ww * 0.2, 0, 7);
            ctx.fill();
            ctx.fillRect(x + ww * 0.25, y + hh * 0.35, ww * 0.5, hh * 0.5);
          }
        }
        ctx.strokeStyle = colors[t.class_name];
        ctx.lineWidth = mapStore.getState().selected === t.id ? 3 : 1;
        ctx.strokeRect(x, y, ww, hh);
        ctx.fillStyle = colors[t.class_name];
        ctx.font = "10px monospace";
        ctx.fillText(`${t.id} ${Math.round(t.confidence * 100)}%`, x, y - 5);
        if (t.coordinate_space === "LOCAL") {
          ctx.beginPath();
          for (const [i, p] of t.trajectory.slice(-20).entries()) {
            const px = (0.06 + ((p.x + 190) / 440) * 0.72 + bw / 2) * w,
              py = (0.22 + ((p.y + 160) / 380) * 0.55 + bh) * h;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.fillStyle = "rgba(2,12,21,.6)";
      ctx.fillRect(0, h - 22, w, 22);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#b1c9d4";
      ctx.fillText(
        `${sensor.id.toUpperCase()}  •  ${playback ? "HISTORICAL RECONSTRUCTION" : sensor.provenance + " SCENE"}  •  ${new Date(playback || Date.now()).toISOString().slice(11, 19)} UTC`,
        10,
        h - 7,
      );
      if (sensor.status === "OFFLINE" && !playback) {
        ctx.fillStyle = "rgba(2,9,16,.85)";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ff8181";
        ctx.textAlign = "center";
        ctx.fillText("CAMERA OFFLINE", w / 2, h / 2);
        ctx.textAlign = "left";
      }
    };
    animation = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animation);
  }, [
    sensor.id,
    sensor.type,
    sensor.status,
    sensor.provenance,
    zoom,
    playback,
  ]);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    [],
  );
  function snapshot() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = sensor.id + "-" + Date.now() + ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    });
  }
  function record() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = canvas.current!.captureStream(12);
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        const blob = new Blob(chunks, { type: r.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = sensor.id + ".webm";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        stream.getTracks().forEach((t) => t.stop());
      };
      r.start();
      recorder.current = r;
      setRecording(true);
    } catch {
      setError("Recording unavailable in this browser");
    }
  }
  return (
    <div className="feed" ref={container}>
      <div className="feed-label">
        <span>
          <i className={sensor.status === "ONLINE" ? "dot" : "dot red"} />
          {sensor.name}
        </span>
        <span>{recording ? "● REC" : sensor.resolution}</span>
      </div>
      <canvas
        ref={canvas}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width - 0.5) / zoom + 0.5,
            y = ((e.clientY - r.top) / r.height - 0.5) / zoom + 0.5;
          const t = tracks.find(
            (t) =>
              t.sensor_sources.includes(sensor.id) &&
              x >= t.bbox[0] &&
              x <= t.bbox[0] + t.bbox[2] &&
              y >= t.bbox[1] &&
              y <= t.bbox[1] + t.bbox[3],
          );
          if (t) select(t.id);
        }}
      />
      <div className="feed-controls">
        <span>
          {sensor.fps} FPS · {sensor.latency} ms {error && " · " + error}
        </span>
        <Button title="Snapshot" onClick={snapshot}>
          <Camera size={12} />
        </Button>
        <Button title="Record locally" onClick={record}>
          {recording ? <Square size={12} /> : <Video size={12} />}
        </Button>
        <Button
          title="Zoom out"
          onClick={() => setZoom((v) => Math.max(1, v - 0.5))}
        >
          <Minus size={12} />
        </Button>
        <span>{zoom.toFixed(1)}×</span>
        <Button
          title="Zoom in"
          onClick={() => setZoom((v) => Math.min(4, v + 0.5))}
        >
          <Plus size={12} />
        </Button>
        <Button
          title="Fullscreen"
          onClick={() =>
            container.current
              ?.requestFullscreen()
              .catch(() => setError("Fullscreen unavailable"))
          }
        >
          <Maximize size={12} />
        </Button>
      </div>
    </div>
  );
});
