import { NextResponse } from "next/server";
import { insertEvent } from "@/lib/gsheets";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, date, type, description } = body || {};

    if (!title || !date || !type) {
      return NextResponse.json(
        { error: "title, date, type are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    const saved = await insertEvent({
      id,
      title,
      date,
      type,
      description: description ?? "",
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "error" }, { status: 500 });
  }
}
