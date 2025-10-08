// app/api/events/delete/route.ts
import { NextResponse } from "next/server";
import { deleteEventById } from "@/lib/gsheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
// export const runtime = "nodejs"; // opcional

function noCache(status = 200): ResponseInit {
  return {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) ?? {};
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "id required" }, noCache(400));
    }

    await deleteEventById(id);
    return NextResponse.json({ ok: true }, noCache(200));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "error" },
      noCache(500),
    );
  }
}

// Preflight (opcional, por si usas CORS en el futuro)
export async function OPTIONS() {
  return new NextResponse(null, noCache(204));
}
