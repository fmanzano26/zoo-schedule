// app/api/events/range/route.ts
import { NextResponse } from "next/server";
import { listEventsInRange } from "@/lib/gsheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";        // ✅ fuerza Node (streams/gsuite)
export const revalidate = 0;
export const fetchCache = "force-no-store";

function noCache(status = 200): ResponseInit {
  return {
    status,
    headers: {
      // evita cache y transformaciones de proxies
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const MAX_DAYS = 120; // límite de seguridad

function parseDateUTC(s: string): Date | null {
  if (!DATE_RE.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // coherencia (evita 2025-02-31, etc.)
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let from = (searchParams.get("from") || "").trim();
    let to   = (searchParams.get("to")   || "").trim();

    if (!from || !to) {
      return NextResponse.json({ error: "from/to required" }, noCache(400));
    }

    const fromDt = parseDateUTC(from);
    const toDt   = parseDateUTC(to);
    if (!fromDt || !toDt) {
      return NextResponse.json({ error: "from/to must be valid YYYY-MM-DD" }, noCache(400));
    }

    // normaliza orden
    let start = fromDt;
    let end   = toDt;
    if (start.getTime() > end.getTime()) [start, end] = [end, start];

    // límite de rango
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays > MAX_DAYS) {
      return NextResponse.json({ error: `range too large (max ${MAX_DAYS} days)` }, noCache(400));
    }

    // vuelve a ISO YYYY-MM-DD (UTC) por si el usuario pasó fechas desordenadas
    const toISO = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

    const items = await listEventsInRange(toISO(start), toISO(end));

    // mantenemos el mismo shape que ya usabas: solo el array
    return NextResponse.json(items, noCache(200));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, noCache(500));
  }
}

// Preflight (opcional)
export async function OPTIONS() {
  return NextResponse.json(null, noCache(204));
}
