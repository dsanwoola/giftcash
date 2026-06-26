import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { parseGtbankCreditAlert } from "@/lib/payments/bank-transfer";
import { processParsedBankAlert } from "@/lib/payments/reconciliation";

function firstAddress(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstAddress(value[0]);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (obj.email as string | undefined) ?? (obj.address as string | undefined) ?? (obj.inboxId as string | undefined) ?? (obj.id as string | undefined);
  }
  return undefined;
}

function extractText(payload: Record<string, unknown>): string | undefined {
  const direct = payload.text ?? payload.textPlain ?? payload.plain ?? payload.body;
  if (typeof direct === "string") return direct;
  const content = payload.content;
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    return (c.text as string | undefined) ?? (c.plain as string | undefined) ?? (c.body as string | undefined);
  }
  return undefined;
}

function extractHtml(payload: Record<string, unknown>): string | undefined {
  const direct = payload.html ?? payload.bodyHtml;
  if (typeof direct === "string") return direct;
  const content = payload.content;
  if (content && typeof content === "object") return (content as Record<string, unknown>).html as string | undefined;
  return undefined;
}

// POST /api/payments/agentmail — receives AgentMail inbound message webhooks or a poller-forwarded message.
export async function POST(req: Request) {
  try {
    const configuredSecret = process.env.AGENTMAIL_WEBHOOK_SECRET || process.env.BANK_ALERT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const supplied = req.headers.get("x-agentmail-webhook-secret") || req.headers.get("x-giftcash-bank-alert-secret");
      if (supplied !== configuredSecret) throw new HttpError(401, "Invalid AgentMail webhook secret.");
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const message = (payload.message && typeof payload.message === "object" ? payload.message : payload) as Record<string, unknown>;
    const result = await processParsedBankAlert(parseGtbankCreditAlert({
      from: firstAddress(message.from ?? message.sender),
      to: firstAddress(message.to ?? message.recipients ?? message.recipient),
      subject: (message.subject as string | undefined) ?? "",
      text: extractText(message),
      html: extractHtml(message),
      receivedAt: (message.receivedAt as string | undefined) ?? (message.createdAt as string | undefined) ?? new Date().toISOString(),
    }));

    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
