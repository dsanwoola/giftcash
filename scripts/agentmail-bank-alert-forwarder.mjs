#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { AgentMailClient } from "agentmail";

const apiKey = process.env.AGENTMAIL_API_KEY;
const inboxId = process.env.AGENTMAIL_INBOX_ID || process.env.AGENTMAIL_EMAIL || "chineye@agentmail.to";
const webhookUrl = process.env.GIFTCASH_BANK_ALERT_WEBHOOK_URL;
const webhookSecret = process.env.AGENTMAIL_WEBHOOK_SECRET || process.env.BANK_ALERT_WEBHOOK_SECRET;
const stateFile = resolve(process.env.GIFTCASH_AGENTMAIL_STATE_FILE || ".giftcash-agentmail-state.json");
const bankSender = (process.env.GIFTCASH_BANK_ALERT_SENDER || "GENS@GTBANK.COM").toLowerCase();

if (!apiKey) throw new Error("AGENTMAIL_API_KEY is required.");
if (!webhookUrl) throw new Error("GIFTCASH_BANK_ALERT_WEBHOOK_URL is required, e.g. https://<giftcash-host>/api/payments/agentmail");

const client = new AgentMailClient({ apiKey });

async function readState() {
  try { return JSON.parse(await readFile(stateFile, "utf8")); } catch { return { processed: [] }; }
}
async function saveState(state) {
  await mkdir(dirname(stateFile), { recursive: true });
  state.processed = [...new Set(state.processed)].slice(-500);
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}
function emailOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return emailOf(value[0]);
  if (typeof value === "object") return value.email || value.address || value.inboxId || value.id || "";
  return "";
}
function listFromResponse(result) {
  return result?.messages || result?.data || result?.items || (Array.isArray(result) ? result : []);
}
function textFromMessage(message) {
  return message.text || message.textPlain || message.plain || message.body || message.content?.text || message.content?.plain || "";
}
function htmlFromMessage(message) {
  return message.html || message.bodyHtml || message.content?.html || "";
}

const state = await readState();
const processed = new Set(state.processed || []);
const result = await client.inboxes.messages.list(inboxId, { limit: 50, from: bankSender });
const messages = listFromResponse(result)
  .filter((message) => !processed.has(message.id || message.messageId))
  .filter((message) => emailOf(message.from || message.sender).toLowerCase().includes(bankSender))
  .reverse();

let forwarded = 0;
for (const message of messages) {
  const id = message.id || message.messageId;
  const payload = {
    message: {
      id,
      from: message.from || message.sender,
      to: message.to || message.recipients,
      subject: message.subject || "",
      text: textFromMessage(message),
      html: htmlFromMessage(message),
      receivedAt: message.receivedAt || message.createdAt || new Date().toISOString(),
    },
  };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookSecret ? { "x-agentmail-webhook-secret": webhookSecret } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`GiftCash webhook failed for ${id}: ${res.status} ${body}`);
  processed.add(id);
  forwarded += 1;
  console.log(`forwarded ${id}: ${body}`);
}
state.processed = [...processed];
state.lastRunAt = new Date().toISOString();
state.lastForwarded = forwarded;
await saveState(state);
if (forwarded === 0) console.log("No new GTBank AgentMail alerts to forward.");
