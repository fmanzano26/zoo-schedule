// lib/db.ts
export type EventType =
  | "Reservierung"
  | "Veranstaltung"
  | "Wartung"
  | "Reparatur"
  | "Sonstiges";

export type DBEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  description?: string | null;
  created_at: string;
};

export const TYPE_COLORS: Record<EventType, string> = {
  Reservierung: "#22c55e",
  Veranstaltung: "#38bdf8",
  Wartung: "#eab308",
  Reparatur: "#8b5cf6",
  Sonstiges: "#f472b6",
};

// ---- Base URL absoluta (necesario para A2HS/iOS) ----
const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ??
  (typeof window !== "undefined" ? window.location.origin : "");

const ORIGIN = (BASE_URL || "").replace(/\/$/, "");

// Normaliza a URL absoluta
function toAbs(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

// ---- Helper fetch con no-cache + cache buster ----
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const sep = url.includes("?") ? "&" : "?";
  const busted = `${url}${sep}t=${Date.now()}`;

  const res = await fetch(busted, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, max-age=0",
      pragma: "no-cache",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore json parse
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

// ---- API pública usada por la UI ----
export const db = {
  async range(fromISO: string, toISO: string): Promise<DBEvent[]> {
    const qs = new URLSearchParams({ from: fromISO, to: toISO }).toString();
    return api<DBEvent[]>(toAbs(`/api/events/range?${qs}`));
  },

  async insert(
    ev: Pick<DBEvent, "title" | "date" | "type" | "description">
  ): Promise<DBEvent> {
    return api<DBEvent>(toAbs("/api/events/insert"), {
      method: "POST",
      body: JSON.stringify(ev),
    });
  },

  async delete(id: string): Promise<void> {
    return api<void>(toAbs("/api/events/delete"), {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },
};
