import { NextResponse } from "next/server";
import { createD1Event, listD1Events } from "@/lib/data/d1-events";
import { fail } from "@/lib/api/handle";
import type { CreateEventInput } from "@/lib/data/repo-types";

export async function GET() {
  try {
    const events = await listD1Events();
    return NextResponse.json({ events });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as CreateEventInput;
    const event = await createD1Event(input);
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
