import { authStore } from "../stores";
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authStore.getState().token,
      ...options.headers,
    },
  });
  if (response.status === 401) {
    authStore.getState().logout();
    throw new Error("Session expired — please sign in");
  }
  if (!response.ok) {
    const e = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(
      typeof e.detail === "string" ? e.detail : JSON.stringify(e.detail),
    );
  }
  return response.json();
}
export function post<T = unknown>(path: string, body: unknown = {}) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}
export function download(
  name: string,
  content: BlobPart,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
