import { useQuery } from "@tanstack/react-query";
import { mapStore, trackStore, detectionStore } from "../stores";
import { api } from "../services/api";
import type { Track, Detection } from "../types/domain";
export function useScene() {
  const at = mapStore((s) => s.playback);
  const tracks = trackStore((s) => s.items);
  const detections = detectionStore((s) => s.items);
  const history = useQuery({
    queryKey: ["playback", at],
    queryFn: () =>
      api<{ tracks: Track[]; detections: Detection[]; timestamp: string }>(
        "/playback?at=" + encodeURIComponent(at!),
      ),
    enabled: !!at,
  });
  return {
    tracks: at ? history.data?.tracks || [] : tracks,
    detections: at ? history.data?.detections || [] : detections,
    loading: history.isFetching,
    error: history.error,
  };
}
