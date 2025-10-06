import { supabase } from "./supabase";

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

export const db = {
  async range(fromISO: string, toISO: string): Promise<DBEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("date", fromISO)
      .lte("date", toISO)
      .order("date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as DBEvent[];
  },

  async insert(ev: Pick<DBEvent, "title" | "date" | "type" | "description">): Promise<DBEvent> {
    const { data, error } = await supabase
      .from("events")
      .insert(ev)
      .select()
      .single();
    if (error) throw error;
    return data as DBEvent;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  },
};
