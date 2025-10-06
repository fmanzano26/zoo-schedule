
'use client';
import { createClient } from '@supabase/supabase-js';

export type EventType = 'Reservierung' | 'Veranstaltung' | 'Wartung' | 'Reparatur' | 'Sonstiges';
export type DBEvent = { id: string; title: string; date: string; type: EventType; description?: string | null; created_at: string; };

export const TYPE_COLORS: Record<EventType,string> = {
  Reservierung:'#22c55e', Veranstaltung:'#38bdf8', Wartung:'#eab308', Reparatur:'#8b5cf6', Sonstiges:'#f472b6'
};

const LS_KEY='zoo.events.v1';
const lsRead=():DBEvent[]=>{ try{ const raw=localStorage.getItem(LS_KEY); return raw? JSON.parse(raw):[]; }catch{ return []; } };
const lsWrite=(v:DBEvent[])=> localStorage.setItem(LS_KEY, JSON.stringify(v));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabase = Boolean(url && key);

export const db = {
  async range(fromISO:string, toISO:string): Promise<DBEvent[]> {
    if (hasSupabase) {
      const client = createClient(url!, key!);
      const { data, error } = await client.from('events').select('*').gte('date', fromISO).lte('date', toISO).order('date');
      if (error) throw error; return (data??[]) as DBEvent[];
    } else {
      return lsRead().filter(e=> e.date>=fromISO && e.date<=toISO);
    }
  },
  async insert(ev: Pick<DBEvent,'title'|'date'|'type'|'description'>): Promise<DBEvent> {
    if (hasSupabase) {
      const client = createClient(url!, key!);
      const { data, error } = await client.from('events').insert(ev).select('*').single();
      if (error) throw error; return data as DBEvent;
    } else {
      const item: DBEvent = { id: (crypto?.randomUUID?.()||Math.random().toString(36).slice(2)) as string, title: ev.title, date: ev.date, type: ev.type, description: ev.description??null, created_at: new Date().toISOString() };
      const all = lsRead(); all.push(item); lsWrite(all); return item;
    }
  }
};
