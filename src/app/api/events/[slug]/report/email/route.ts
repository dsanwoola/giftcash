import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { requireUid, HttpError } from "@/lib/data/server-store";
import { adminDb } from "@/lib/firebase/admin";
import type { GiftEvent } from "@/lib/types";
import {
  buildEventReportExcelHtml,
  buildEventReportPdfBytes,
  eventReportEmailText,
  eventReportFileName,
  eventReportSubject,
  type EventReportFormat,
} from "@/lib/reports/event-report";

interface EmailReportRequest {
  email?: string;
  format?: EventReportFormat;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const uid = await requireUid(req);
    const { slug } = await ctx.params;
    const body = (await req.json()) as EmailReportRequest;
    const email = body.email?.trim().toLowerCase() ?? "";
    const format: EventReportFormat = body.format === "pdf" ? "pdf" : "excel";

    if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address.");

    const snap = await adminDb().collection("events").doc(slug).get();
    const event = snap.data() as GiftEvent | undefined;
    if (!event) throw new HttpError(404, "Event not found");
    if (event.organizerId !== uid) throw new HttpError(403, "Only the event organizer can email this report.");

    const apiKey = process.env.AGENTMAIL_API_KEY;
    const inbox = process.env.AGENTMAIL_EMAIL;
    if (!apiKey || !inbox) throw new HttpError(500, "Report email service is not configured.");

    const generated = new Date();
    const filename = eventReportFileName(event, format, generated);
    const bytes = format === "pdf"
      ? Buffer.from(buildEventReportPdfBytes(event))
      : Buffer.from(buildEventReportExcelHtml(event), "utf8");

    const response = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: eventReportSubject(event),
        text: eventReportEmailText(event, format),
        attachments: [
          {
            content: bytes.toString("base64"),
            filename,
            content_type: format === "pdf" ? "application/pdf" : "application/vnd.ms-excel",
          },
        ],
      }),
    });
    const sent = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new HttpError(response.status, sent?.error ?? sent?.message ?? "Could not send report email.");
    }

    return NextResponse.json({ ok: true, messageId: sent.message_id ?? sent.messageId ?? null, threadId: sent.thread_id ?? sent.threadId ?? null });
  } catch (e) {
    return fail(e);
  }
}
