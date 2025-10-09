// app/api/events/insert/route.ts
import { NextResponse } from "next/server";
import { insertEvent } from "@/lib/gsheets";
import type { EventType } from "@/lib/db";
import sseBus from "@/lib/sse-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

// util cabeceras no-cache
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

const TYPES: readonly EventType[] = [
  "Reservierung",
  "Veranstaltung",
  "Wartung",
  "Reparatur",
  "Sonstiges",
];

function isEventType(v: unknown): v is EventType {
  return typeof v === "string" && (TYPES as readonly string[]).includes(v);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/; // YYYY-MM-DD

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const date  = typeof body?.date  === "string" ? body.date.trim()  : "";
    const type  = body?.type;
    const description =
      typeof body?.description === "string" ? body.description : "";

    if (!title || !date || !type) {
      return NextResponse.json(
        { error: "title, date, type are required" },
        noCache(400),
      );
    }

    if (!DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
        noCache(400),
      );
    }

    if (!isEventType(type)) {
      return NextResponse.json(
        { error: "type is invalid" },
        noCache(400),
      );
    }

    if (title.length < 2) {
      return NextResponse.json(
        { error: "title is too short" },
        noCache(400),
      );
    }

    const id = crypto.randomUUID();

    const saved = await insertEvent({
      id,
      title,
      date,
      type,
      description,
    });

    // notificar a los clientes conectados (SSE)
    sseBus.emit();

    return NextResponse.json(saved, noCache(200));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, noCache(500));
  }
}

// Preflight (opcional)
export async function OPTIONS() {
  return NextResponse.json(null, noCache(204));
}
