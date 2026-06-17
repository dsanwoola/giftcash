/* ------------------------------------------------------------------ *
 * Share helpers — build platform deep-links, calendar links and an .ics
 * file for any shareable URL (events, group gifts, gifts).
 * ------------------------------------------------------------------ */

export interface ShareData {
  url: string;
  title: string;
  text: string;
}

const enc = encodeURIComponent;

/** Deep-links for the major messaging/social platforms. */
export function shareLinks({ url, title, text }: ShareData) {
  const u = enc(url);
  const t = enc(text);
  const textAndUrl = enc(`${text}\n\n${url}`);
  return {
    whatsapp: `https://wa.me/?text=${textAndUrl}`,
    sms: `sms:?&body=${textAndUrl}`,
    email: `mailto:?subject=${enc(title)}&body=${textAndUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  } as const;
}

export type ShareChannel = keyof ReturnType<typeof shareLinks>;

export interface CalendarEvent {
  title: string;
  details: string;
  location?: string;
  /** ISO start; end defaults to +2h. */
  start: string;
  end?: string;
}

const stampUtc = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(e: CalendarEvent): string {
  const end = e.end ?? new Date(new Date(e.start).getTime() + 2 * 3600_000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stampUtc(e.start)}/${stampUtc(end)}`,
    details: e.details,
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsContent(e: CalendarEvent): string {
  const end = e.end ?? new Date(new Date(e.start).getTime() + 2 * 3600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gift Cash//Events//EN",
    "BEGIN:VEVENT",
    `UID:${stampUtc(e.start)}-${Math.random().toString(36).slice(2)}@giftcash`,
    `DTSTAMP:${stampUtc(new Date().toISOString())}`,
    `DTSTART:${stampUtc(e.start)}`,
    `DTEND:${stampUtc(end)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${e.details.replace(/\n/g, "\\n")}`,
    e.location ? `LOCATION:${e.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Trigger a client-side download of text content. */
export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

/** Use the native share sheet when available; returns false if unsupported. */
export async function nativeShare(data: ShareData): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
      return true;
    } catch {
      return false; // user cancelled
    }
  }
  return false;
}
