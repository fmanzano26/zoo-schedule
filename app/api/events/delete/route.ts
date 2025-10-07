import { NextResponse } from "next/server";
import { deleteEventById } from "@/lib/gsheets";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body || {};
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await deleteEventById(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, { status: 500 });
  }
}
