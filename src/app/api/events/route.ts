import { NextResponse } from "next/server";
import { createFirebaseEvent, listFirebaseEvents } from "@/lib/data/firebase-events";
import { fail } from "@/lib/api/handle";
import type { CreateEventInput } from "@/lib/data/repo-types";

export async function GET() {
  try {
    const events = await listFirebaseEvents();
    return NextResponse.json({ events });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as CreateEventInput;
    const event = await createFirebaseEvent(input);
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
