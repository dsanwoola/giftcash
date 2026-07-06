import "server-only";
import { nanoid } from "nanoid";
import { adminDb } from "../firebase/admin";
import { buildSeed, DEMO_USER_ID } from "./seed";
import type { GiftEvent } from "../types";
import type { CreateEventInput } from "./repo-types";

const slugify = (name: string) =>
  `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event"}-${nanoid(6)}`;

function seedEvent(slug: string): GiftEvent | undefined {
  return buildSeed().events[slug];
}

function cleanText(value: string | undefined, fallback = "") {
  return (value ?? fallback).trim().replace(/\s+/g, " ");
}

function normalizeEvent(input: CreateEventInput): GiftEvent {
  const celebrants = cleanText(input.celebrants);
  if (celebrants.length < 2) throw new Error("Celebrant name is required.");
  const title = cleanText(input.title, `${celebrants} Occasion`);
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) throw new Error("Valid event date is required.");
  return {
    id: nanoid(),
    slug: slugify(title || celebrants),
    organizerId: DEMO_USER_ID,
    organizerName: cleanText(input.organizerName, "Occasion host"),
    type: input.type,
    title,
    celebrants,
    date: date.toISOString(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    story: input.story,
    gradient: input.gradient,
    currency: input.currency,
    showTotal: input.showTotal,
    goalAmount: input.goalAmount,
    campaignMode: input.campaignMode,
    maxContribution: input.maxContribution,
    settlementAccount: input.settlementAccount,
    payoutProvider: input.payoutProvider,
    isPublic: input.isPublic,
    ticketingEnabled: input.ticketingEnabled,
    rsvpEnabled: input.rsvpEnabled,
    seatingEnabled: input.seatingEnabled,
    checkInEnabled: input.checkInEnabled,
    ticketTypes: input.ticketTypes ?? [],
    tables: input.tables ?? [],
    guests: input.guests ?? [],
    tickets: input.tickets ?? [],
    contributions: [],
    createdAt: new Date().toISOString(),
  };
}

export async function createD1Event(input: CreateEventInput): Promise<GiftEvent> {
  const event = normalizeEvent(input);
  await adminDb().collection<GiftEvent>("events").doc(event.slug).set(event);
  return event;
}

export async function getD1Event(slug: string): Promise<GiftEvent | undefined> {
  const snap = await adminDb().collection<GiftEvent>("events").doc(slug).get();
  return snap.data() ?? seedEvent(slug);
}

export async function listD1Events(limit = 25): Promise<GiftEvent[]> {
  const snap = await adminDb().collection<GiftEvent>("events").orderBy("createdAt", "desc").limit(limit).get();
  const events = snap.docs.map((doc) => doc.data());
  const seed = seedEvent("tunde-and-zainab");
  if (seed && !events.some((event) => event.slug === seed.slug)) events.push(seed);
  return events;
}
