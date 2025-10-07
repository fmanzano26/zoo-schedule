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

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const db = {
  async range(fromISO: string, toISO: string): Promise<DBEvent[]> {
    const qs = new URLSearchParams({ from: fromISO, to: toISO }).toString();
    return api<DBEvent[]>(`/api/events/range?${qs}`);
  },

  async insert(
    ev: Pick<DBEvent, "title" | "date" | "type" | "description">
  ): Promise<DBEvent> {
    return api<DBEvent>("/api/events/insert", {
      method: "POST",
      body: JSON.stringify(ev),
    });
  },

  async delete(id: string): Promise<void> {
    return api<void>("/api/events/delete", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },
};
