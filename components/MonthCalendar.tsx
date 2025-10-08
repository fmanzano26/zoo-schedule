"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Trash2 } from "lucide-react";
import { db, TYPE_COLORS, type EventType, type DBEvent } from "@/lib/db";

/* ================== Utilidades de fecha ================== */
function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function monthLabel(d: Date, locale = "de-CH") {
  return d.toLocaleString(locale, { month: "long", year: "numeric" });
}
function addMonth(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
function monthMatrix(current: Date) {
  const start = new Date(current.getFullYear(), current.getMonth(), 1);
  const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  const daysInMonth = end.getDate();
  const startDow = (start.getDay() + 6) % 7; // lunes=0

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(current.getFullYear(), current.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < 6; i++) weeks.push(cells.slice(i * 7, i * 7 + 7));
  return weeks;
}
function formatDateCH(d: Date) {
  const dd = String(d.getDate());
  const mm = String(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/* ================== Modal básico ================== */
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[min(720px,92vw)] rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-xl p-2 text-gray-300 hover:bg-white/10"
          onClick={onClose}
          aria-label="close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/* ================== Mini DatePicker oscuro ================== */
function MiniDatePicker({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const weeks = monthMatrix(view);

  function prev() {
    setView(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  }
  function next() {
    setView(new Date(view.getFullYear(), view.getMonth() + 1, 1));
  }
  function select(d: Date) {
    onChange(d);
    onClose();
  }

  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = popRef.current;
      if (el && !el.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [onClose]);

  // Evitar que aparezca teclado en móvil
  const stopAll = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={popRef}
      className="absolute z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-neutral-900 p-3 shadow-2xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10" onClick={prev} onMouseDown={stopAll} onTouchStart={stopAll}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm text-gray-200">{monthLabel(view)}</div>
        <button type="button" className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10" onClick={next} onMouseDown={stopAll} onTouchStart={stopAll}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((w, ri) =>
          w.map((d, ci) => {
            const isEmpty = !d;
            const isSel =
              d &&
              d.getDate() === value.getDate() &&
              d.getMonth() === value.getMonth() &&
              d.getFullYear() === value.getFullYear();

            if (isEmpty) return <div key={`${ri}-${ci}`} className="h-8" />;

            return (
              <button
                type="button"
                key={`${ri}-${ci}`}
                onClick={() => select(d!)}
                onMouseDown={stopAll}
                onTouchStart={stopAll}
                className={`h-8 rounded-lg text-sm hover:bg-neutral-700/70 ${
                  isSel ? "bg-violet-600 text-white" : "bg-neutral-800/70 text-gray-200"
                }`}
              >
                {d!.getDate()}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

/* ================== Formulario de alta ================== */
function AddEventForm({ defaultDate, onSaved }: { defaultDate: Date; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(isoDate(defaultDate));
  const [type, setType] = useState<EventType>("Reservierung");
  const [desc, setDesc] = useState("");
  const [openPicker, setOpenPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openPicker) return;
    function onDown(e: MouseEvent) {
      const el = pickerRef.current;
      if (el && !el.contains(e.target as Node)) setOpenPicker(false);
    }
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [openPicker]);

  function togglePicker() {
    (document.activeElement as HTMLElement | null)?.blur();
    setOpenPicker((v) => !v);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    await db.insert({ title, date, type, description: desc });
    onSaved();
  }

  const inputCls =
    "w-full rounded-xl bg-neutral-800/80 px-4 py-3 outline-none ring-violet-500/60 focus:ring-2 text-gray-100 placeholder-gray-400";

  return (
    <form onSubmit={save} className="space-y-5 text-gray-100">
      <h3 className="mb-2 text-xl font-semibold">Neuer Eintrag</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Titel</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
          <p className="mt-1 text-xs text-red-300/80">Titel muss mindestens 2 Zeichen lang sein.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Typ</label>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {(["Reservierung", "Veranstaltung", "Wartung", "Reparatur", "Sonstiges"] as EventType[]).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Datum</label>
          <div className="relative" ref={pickerRef}>
            <div className="flex items-center gap-2">
              {/* Botón con aspecto de input: no abre teclado */}
              <button
                type="button"
                aria-label={`Fecha: ${formatDateCH(new Date(date))}`}
                aria-haspopup="dialog"
                aria-expanded={openPicker}
                onClick={togglePicker}
                className={inputCls + " font-medium text-left"}
              >
                {formatDateCH(new Date(date))}
              </button>

              <button
                type="button"
                onClick={togglePicker}
                className="h-[46px] min-w-[46px] rounded-xl border border-white/10 bg-neutral-800/80 p-2 text-gray-200 hover:bg-neutral-700/80"
              >
                <CalendarDays size={18} />
              </button>
            </div>
            {openPicker && (
              <MiniDatePicker
                value={new Date(date)}
                onChange={(d) => setDate(isoDate(d))}
                onClose={() => setOpenPicker(false)}
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Farbe (automatisch)</label>
          <div className="flex h-[46px] items-center gap-3 rounded-xl bg-neutral-800/80 px-3">
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: TYPE_COLORS[type] }} />
            <span className="text-sm text-gray-300">durch Typ festgelegt</span>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300">Beschreibung</label>
        <textarea className={inputCls + " min-h-[120px]"} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-800/80 px-4 py-2 text-gray-200 hover:bg-neutral-700/80"
          onClick={onSaved}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 font-medium text-white shadow-lg shadow-violet-700/30 hover:brightness-110"
        >
          Speichern
        </button>
      </div>
    </form>
  );
}

/* ================== Calendario mensual ================== */
export default function MonthCalendar() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [listOpenFor, setListOpenFor] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function load() {
    const first = new Date(current.getFullYear(), current.getMonth(), 1);
    const last = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const data = await db.range(isoDate(first), isoDate(last));
    setEvents(data);
  }

  // Mini-retry: por si Sheets tarda un poco en reflejar escrituras
  async function loadWithRetry(tries = 2) {
    try {
      await load();
    } catch {}
    if (tries > 0) {
      setTimeout(() => void loadWithRetry(tries - 1), 350);
    }
  }

  useEffect(() => {
    load();
  }, [current]);

  // 🔁 Refrescar al volver a primer plano / foco (PWA iOS y navegador)
  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const mapped = useMemo(() => {
    const m: Record<string, DBEvent[]> = {};
    for (const ev of events) (m[ev.date] ||= []).push(ev);
    return m;
  }, [events]);

  function DaysGrid() {
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7;
    const colStartMap = ["col-start-1", "col-start-2", "col-start-3", "col-start-4", "col-start-5", "col-start-6", "col-start-7"];

    const items: JSX.Element[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = isoDate(dateObj);
      const dayEvents = mapped[dateStr] || [];
      const isFirst = d === 1;
      const colStart = isFirst ? colStartMap[startDow] : "";

      items.push(
        <div
          key={d}
          className={`relative h-12 sm:h-14 md:h-16 rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/80 transition-colors hover:bg-neutral-800/80 ${colStart}`}
        >
          <div className="absolute left-3 top-1.5 text-sm text-gray-300">{d}</div>

          {/* Indicadores centrados, con wrap y contador +N */}
          {(() => {
            const MAX_DOTS = 8;
            const dots = dayEvents.slice(0, MAX_DOTS);
            return (
              <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 w-[calc(100%-16px)] flex flex-wrap justify-center content-center gap-1">
                {dots.map((ev, idx) => (
                  <span
                    key={ev.id + idx}
                    className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full"
                    style={{ background: TYPE_COLORS[ev.type] }}
                  />
                ))}
                {dayEvents.length > MAX_DOTS && (
                  <span className="rounded-full bg-neutral-700/80 px-1 text-[9px] leading-4 text-gray-200 md:px-1.5 md:text-[10px]">
                    +{dayEvents.length - MAX_DOTS}
                  </span>
                )}
              </div>
            );
          })()}

          {/* CLICK: si hay eventos → lista; si no → nuevo */}
          <button
            onClick={() => {
              if (dayEvents.length > 0) {
                setListOpenFor(dateStr);
              } else {
                setSelectedDate(dateObj);
                setOpen(true);
              }
            }}
            className="absolute inset-0"
            title="Abrir"
          />
        </div>,
      );
    }
    return <div className="grid grid-cols-7 gap-2 p-2 sm:p-3">{items}</div>;
  }

  return (
    <div className="text-gray-100">
      {/* Título */}
      <div className="px-5 pt-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-cyan-300 drop-shadow-[0_0_16px_rgba(125,243,255,0.55)]">
          Zoo Schedule
        </h1>

        {/* Botón NUEVO */}
        <div className="mt-4 flex justify-start md:justify-end">
          <button
            type="button"
            aria-label="Neuer Eintrag"
            onClick={() => {
              setSelectedDate(new Date());
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-base font-medium text-white shadow-lg shadow-violet-700/30 hover:brightness-110"
          >
            <Plus size={18} /> Neuer Eintrag
          </button>
        </div>
      </div>

      {/* Barra de mes */}
      <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/60 px-5 py-4">
        <div className="text-lg">{monthLabel(current)}</div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-xl border border-white/10 bg-neutral-800/80 p-2 text-gray-300 hover:bg-neutral-700/80" onClick={() => setCurrent(addMonth(current, -1))}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="rounded-xl border border-white/10 bg-neutral-800/80 p-2 text-gray-300 hover:bg-neutral-700/80" onClick={() => setCurrent(addMonth(current, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Cabeceras de días */}
      <div className="px-4 pb-2 pt-3">
        <div className="grid grid-cols-7 gap-2 px-2 text-center text-sm text-gray-300">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Días */}
      <DaysGrid />

      {/* Leyenda */}
      <div className="mt-4 px-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-gray-300">
          {(
            [
              { key: "Reservierung", label: "Reservierung" },
              { key: "Veranstaltung", label: "Veranstaltung" },
              { key: "Wartung", label: "Wartung" },
              { key: "Reparatur", label: "Reparatur" },
              { key: "Sonstiges", label: "Sonstiges" },
            ] as { key: EventType; label: string }[]
          ).map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-sm">
              <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: TYPE_COLORS[item.key] }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 h-px w-full bg-white/10" />
      </div>

      {/* Modal crear */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <AddEventForm
          defaultDate={selectedDate}
          onSaved={() => {
            setOpen(false);
            void loadWithRetry(); // refresco inmediato + retry
          }}
        />
      </Modal>

      {/* Modal lista del día (con borrar) */}
      <Modal
        open={!!listOpenFor}
        onClose={() => {
          setListOpenFor(null);
          setConfirmingId(null);
        }}
      >
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Einträge am {listOpenFor}</h3>
          <div className="max-h-[55vh] space-y-2 overflow-auto pr-2">
            {(listOpenFor ? (mapped[listOpenFor] || []) : []).map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-800/80 p-3"
              >
                <div className="flex min-w-[200px] flex-1 items-start gap-3">
                  <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: TYPE_COLORS[ev.type] }} />
                  <div>
                    <div className="font-medium">
                      {ev.title} <span className="text-sm text-gray-300">• {ev.type}</span>
                    </div>
                    {ev.description && <div className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{ev.description}</div>}
                  </div>
                </div>

                <div className="ml-0 flex flex-wrap items-center gap-2 sm:ml-4">
                  {confirmingId === ev.id ? (
                    <>
                      <button
                        type="button"
                        className="rounded-xl px-2 py-1 text-xs text-gray-200 bg-neutral-700/80 hover:bg-neutral-600/80 sm:px-3 sm:text-sm"
                        onClick={() => setConfirmingId(null)}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="rounded-xl px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-500 whitespace-nowrap sm:px-3 sm:text-sm"
                        onClick={async () => {
                          await db.delete(ev.id);
                          setConfirmingId(null);
                          void loadWithRetry(); // refresco inmediato + retry
                        }}
                      >
                        Löschen
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label="Eliminar entrada"
                      className="rounded-xl p-2 text-gray-300 hover:bg-white/10"
                      onClick={() => setConfirmingId(ev.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {listOpenFor && (mapped[listOpenFor] || []).length === 0 && (
              <div className="text-gray-300">Keine Einträge.</div>
            )}
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="mx-2 mt-8 pb-6 text-center text-sm text-gray-400">
        <span className="italic">Created by Fran Manzano</span> ©2025
      </footer>
    </div>
  );
}
