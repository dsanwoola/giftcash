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
function isoDate(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (typeof value.toISOString === "function") return value.toISOString();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

const state = await readState();
const processed = new Set(state.processed || []);
const result = await client.inboxes.messages.list(inboxId, { limit: 50, from: [bankSender] });
const messages = listFromResponse(result)
  .filter((message) => !processed.has(message.id || message.messageId))
  .filter((message) => emailOf(message.from || message.sender).toLowerCase().includes(bankSender))
  .reverse();

let forwarded = 0;
for (const listMessage of messages) {
  const id = listMessage.id || listMessage.messageId;
  const message = await client.inboxes.messages.get(inboxId, id);
  const payload = {
    message: {
      id,
      from: message.from || message.sender || listMessage.from || listMessage.sender,
      to: message.to || message.recipients || listMessage.to || listMessage.recipients,
      subject: message.subject || listMessage.subject || "",
      text: textFromMessage(message),
      html: htmlFromMessage(message) || message.extractedHtml || "",
      receivedAt: isoDate(message.receivedAt || message.createdAt || message.timestamp || listMessage.receivedAt || listMessage.createdAt || listMessage.timestamp),
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
if (forwarded === 0 && process.env.GIFTCASH_AGENTMAIL_QUIET_EMPTY !== "true") console.log("No new GTBank AgentMail alerts to forward.");
