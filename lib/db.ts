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

export const EVENT_TYPES = [
  "Reservierung",
  "Veranstaltung",
  "Wartung",
  "Reparatur",
  "Sonstiges",
] as const;

export const TYPE_COLORS: Record<EventType, string> = {
  Reservierung: "#22c55e",
  Veranstaltung: "#38bdf8",
  Wartung: "#eab308",
  Reparatur: "#8b5cf6",
  Sonstiges: "#f472b6",
};

// ---- Base URL absoluta (A2HS/iOS-friendly) ----
// Prioriza env para forzar dominio absoluto en PWA/A2HS.
// En navegación normal, window.location.origin es suficiente.
const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "");

const ORIGIN = (BASE_URL || "").replace(/\/$/, "");

// Normaliza a URL absoluta
function toAbs(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!ORIGIN) {
    throw new Error(
      "[db] ORIGIN vacío. Define NEXT_PUBLIC_SITE_URL o llama desde el navegador."
    );
  }
  return `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

// ---- Helper fetch con no-cache + cache buster + timeout ----
type ApiInit = RequestInit & { timeoutMs?: number };

async function api<T>(url: string, init?: ApiInit): Promise<T> {
  const { timeoutMs = 12000, ...rest } = init ?? {};
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  // Evita caches intermedias
  const sep = url.includes("?") ? "&" : "?";
  const busted = `${url}${sep}t=${Date.now()}`;

  try {
    const res = await fetch(busted, {
      cache: "no-store",
      ...rest,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store, max-age=0",
        pragma: "no-cache",
        ...(rest.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = await res.json().catch(() => null);
        if (j) {
          msg = j.error || j.message || msg;
        }
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    // Algunas rutas devuelven vacío (204/void)
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(t);
  }
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
