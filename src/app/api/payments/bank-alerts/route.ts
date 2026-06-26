import { NextResponse } from "next/server";
import { fail } from "@/lib/api/handle";
import { HttpError } from "@/lib/data/server-store";
import { parseGtbankCreditAlert } from "@/lib/payments/bank-transfer";
import { processParsedBankAlert } from "@/lib/payments/reconciliation";

export interface BankAlertWebhookBody {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
}

export async function POST(req: Request) {
  try {
    const configuredSecret = process.env.BANK_ALERT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const supplied = req.headers.get("x-giftcash-bank-alert-secret");
      if (supplied !== configuredSecret) throw new HttpError(401, "Invalid bank alert webhook secret.");
    }

    const body = (await req.json()) as BankAlertWebhookBody;
    const result = await processParsedBankAlert(parseGtbankCreditAlert(body));
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
