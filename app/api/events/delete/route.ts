// app/api/events/delete/route.ts
import { NextResponse } from "next/server";
import { deleteEventById } from "@/lib/gsheets";
import sseBus from "@/lib/sse-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

// Cabeceras no-cache para evitar que algún proxy guarde la respuesta
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

// UUID v4 (si tus IDs vienen de crypto.randomUUID)
const UUIDv4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "id required" }, noCache(400));
    }
    if (!UUIDv4.test(id)) {
      // Si prefieres permitir otros formatos, elimina esta validación.
      return NextResponse.json({ error: "invalid id" }, noCache(400));
    }

    // Ejecutar borrado en Google Sheets
    const result = await deleteEventById(id);
    // Soportar distintas implementaciones de deleteEventById:
    // - boolean (true si borró)
    // - number   (filas afectadas)
    // - void     (si lanza error cuando no existe)
    let deleted = true;
    if (typeof result === "boolean") deleted = result;
    if (typeof result === "number") deleted = result > 0;

    if (!deleted) {
      return NextResponse.json({ error: "not found" }, noCache(404));
    }

    // Notificar a todos los clientes conectados por SSE (con payload útil)
    sseBus.emit({ event: "changed", op: "delete", id });

    return NextResponse.json({ ok: true }, noCache(200));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "error" },
      noCache(500),
    );
  }
}

// Preflight (opcional)
export async function OPTIONS() {
  return NextResponse.json(null, noCache(204));
}
