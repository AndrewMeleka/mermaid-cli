export type MermaidFile = {
  path: string;
  name: string;
  dir: string;
  size: number;
  modTime: string;
};

export type FilesResponse = { root: string; files: MermaidFile[] };
export type FileResponse = { path: string; content: string; modTime: string };
export type ChangeEvent = { path: string; op: "create" | "write" | "remove" | "rename" };

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

export function fetchFiles(): Promise<FilesResponse> {
  return getJSON<FilesResponse>("/api/files");
}

export function fetchFile(path: string): Promise<FileResponse> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return getJSON<FileResponse>(`/api/files/${encoded}`);
}

/** Subscribes to live-reload events. Returns an unsubscribe function. */
export function subscribeChanges(
  onChange: (ev: ChangeEvent) => void,
  onStatus?: (connected: boolean) => void,
): () => void {
  const es = new EventSource("/api/events");
  es.addEventListener("ready", () => onStatus?.(true));
  es.addEventListener("change", (e) => {
    try {
      onChange(JSON.parse((e as MessageEvent).data) as ChangeEvent);
    } catch {
      /* ignore malformed events */
    }
  });
  es.onerror = () => onStatus?.(false);
  return () => es.close();
}
