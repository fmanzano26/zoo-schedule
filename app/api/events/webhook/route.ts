import { NextResponse } from "next/server";
import sseBus from "@/lib/sse-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET || "";
  const provided =
    req.headers.get("x-webhook-secret") ||
    new URL(req.url).searchParams.get("secret") ||
    "";

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, noCache(401));
  }

  // Avisar a los clientes conectados
  sseBus.emit({ event: "changed" });
  return NextResponse.json({ ok: true }, noCache(200));
}

export async function OPTIONS() {
  return NextResponse.json(null, noCache(204));
}
