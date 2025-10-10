// app/api/events/update/route.ts
import { NextResponse } from "next/server";
import { updateEventById } from "@/lib/gsheets";
import sseBus from "@/lib/sse-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function noCache(status = 200): ResponseInit {
  return {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  };
}

const TYPES = ["Reservierung","Veranstaltung","Wartung","Reparatur","Sonstiges"] as const;
type EventType = typeof TYPES[number];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id    = typeof body?.id === "string" ? body.id.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const date  = typeof body?.date  === "string" ? body.date.trim()  : "";
    const type  = body?.type as EventType | undefined;
    const description = typeof body?.description === "string" ? body.description : "";

    if (!id || !title || !date || !type) {
      return NextResponse.json({ error: "id, title, date, type are required" }, noCache(400));
    }
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, noCache(400));
    }
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: "type is invalid" }, noCache(400));
    }

    const updated = await updateEventById({ id, title, date, type, description });

    if (!updated) {
      return NextResponse.json({ error: "not found" }, noCache(404));
    }

    // notificar a clientes SSE
    sseBus.emit({ event: "changed", op: "update", id });

    return NextResponse.json(updated, noCache(200));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, noCache(500));
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, noCache(204));
}
