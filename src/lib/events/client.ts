"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";
import type { EventSettings } from "@/lib/data/repo-types";
import type { GiftPartyView, OrganizerGiftParty } from "@/lib/types";

async function authHeaders(required = false): Promise<Record<string, string>> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (required && !token) throw new Error("Organizer sign-in is required.");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload as T;
}

export async function fetchGiftParty(slug: string): Promise<GiftPartyView> {
  const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: await authHeaders(false),
  });
  return responseJson<GiftPartyView>(response);
}

export async function fetchOrganizerGiftParty(slug: string): Promise<OrganizerGiftParty> {
  const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: await authHeaders(true),
  });
  const event = await responseJson<GiftPartyView>(response);
  if (event.viewerRole !== "organizer") throw new Error("Only the Gift Party organizer can access this page.");
  return event;
}

export async function updateOrganizerGiftParty(slug: string, settings: EventSettings): Promise<OrganizerGiftParty> {
  const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders(true)) },
    body: JSON.stringify(settings),
  });
  return responseJson<OrganizerGiftParty>(response);
}
