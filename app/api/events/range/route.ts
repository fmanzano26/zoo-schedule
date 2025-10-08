// app/api/events/range/route.ts
import { NextResponse } from "next/server";
import { listEventsInRange } from "@/lib/gsheets";

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let from = (searchParams.get("from") || "").trim();
    let to = (searchParams.get("to") || "").trim();

    if (!from || !to) {
      return NextResponse.json({ error: "from/to required" }, noCache(400));
    }
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json(
        { error: "from/to must be YYYY-MM-DD" },
        noCache(400),
      );
    }

    // Asegura from <= to
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const items = await listEventsInRange(from, to);
    return NextResponse.json(items, noCache(200));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "error" },
      noCache(500),
    );
  }
}

// Preflight (opcional)
export async function OPTIONS() {
  return new NextResponse(null, noCache(204));
}
