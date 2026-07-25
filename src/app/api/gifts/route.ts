import { requireUid, HttpError } from "@/lib/data/server-store";
import { fail } from "@/lib/api/handle";

// Legacy endpoint retained for old clients, but direct funding is permanently blocked.
// New clients must initialize Flutterwave at /api/gifts/payments/flutterwave/initialize.
export async function POST(req: Request) {
  try {
    await requireUid(req);
    throw new HttpError(409, "Direct gift funding is disabled. Start a verified Flutterwave checkout.");
  } catch (error) {
    return fail(error);
  }
}
