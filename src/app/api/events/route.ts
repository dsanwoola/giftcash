import { NextResponse } from "next/server";
import { createFirebaseEvent, listAllFirebaseEvents, listFirebaseEvents } from "@/lib/data/firebase-events";
import { requireUid } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";
import { adminDb } from "@/lib/firebase/admin";
import { adminGiftParty, organizerGiftParty } from "@/lib/events/access";
import type { CreateEventInput } from "@/lib/data/repo-types";
import type { UserProfile } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    const profile = await adminDb().collection<UserProfile>("profiles").doc(uid).get();
    const isAdmin = profile.data()?.role === "admin";
    const events = isAdmin ? await listAllFirebaseEvents() : await listFirebaseEvents(uid);
    return NextResponse.json({
      viewerRole: isAdmin ? "admin" : "organizer",
      events: events.map((event) => isAdmin ? adminGiftParty(event) : organizerGiftParty(event)),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const input = (await req.json()) as CreateEventInput;
    const event = await createFirebaseEvent(input, uid);
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
