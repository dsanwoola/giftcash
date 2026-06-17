"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  CalendarPlus,
  Check,
  Copy,
  Download,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
} from "lucide-react";
import {
  downloadFile,
  googleCalendarUrl,
  icsContent,
  nativeShare,
  shareLinks,
  type CalendarEvent,
} from "@/lib/share";

interface Channel {
  key: string;
  label: string;
  href?: string;
  bg: string;
  fg: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export function ShareHub({
  url,
  title,
  defaultMessage,
  calendar,
  qrLabel = "Scan to open",
}: {
  url: string;
  title: string;
  defaultMessage: string;
  calendar?: CalendarEvent;
  qrLabel?: string;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState<"link" | "msg" | null>(null);
  const qrWrap = useRef<HTMLDivElement>(null);

  const links = shareLinks({ url, title, text: message });

  const copy = async (what: "link" | "msg") => {
    await navigator.clipboard.writeText(what === "link" ? url : `${message}\n\n${url}`);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  const downloadQr = () => {
    const canvas = qrWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  const channels: Channel[] = [
    { key: "whatsapp", label: "WhatsApp", href: links.whatsapp, bg: "#25D366", fg: "#fff", icon: <MessageCircle className="h-5 w-5" /> },
    { key: "sms", label: "SMS", href: links.sms, bg: "#34C759", fg: "#fff", icon: <MessageSquare className="h-5 w-5" /> },
    { key: "email", label: "Email", href: links.email, bg: "#6c6478", fg: "#fff", icon: <Mail className="h-5 w-5" /> },
    { key: "telegram", label: "Telegram", href: links.telegram, bg: "#229ED9", fg: "#fff", icon: <Send className="h-5 w-5" /> },
    { key: "twitter", label: "X", href: links.twitter, bg: "#000", fg: "#fff", icon: <span className="text-base font-bold leading-none">𝕏</span> },
    { key: "facebook", label: "Facebook", href: links.facebook, bg: "#1877F2", fg: "#fff", icon: <span className="text-lg font-bold leading-none">f</span> },
    { key: "more", label: "More", bg: "#6429c9", fg: "#fff", icon: <Share2 className="h-5 w-5" />, onClick: () => nativeShare({ url, title, text: message }) },
    { key: "copy", label: copied === "link" ? "Copied!" : "Copy link", bg: "#e6b143", fg: "#1b1226", icon: copied === "link" ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />, onClick: () => copy("link") },
  ];

  return (
    <div className="space-y-5">
      {/* Editable invite message */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Invite message</label>
          <button onClick={() => copy("msg")} className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
            {copied === "msg" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied === "msg" ? "Copied" : "Copy"}
          </button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-2xl border border-ink/10 bg-white p-3 text-sm outline-none focus:border-brand"
        />
      </div>

      {/* Channels */}
      <div className="grid grid-cols-4 gap-3">
        {channels.map((c) =>
          c.href ? (
            <a key={c.key} href={c.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl shadow-soft transition hover:-translate-y-0.5" style={{ background: c.bg, color: c.fg }}>{c.icon}</span>
              <span className="text-[11px] text-muted">{c.label}</span>
            </a>
          ) : (
            <button key={c.key} onClick={c.onClick} className="flex flex-col items-center gap-1.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl shadow-soft transition hover:-translate-y-0.5" style={{ background: c.bg, color: c.fg }}>{c.icon}</span>
              <span className="text-[11px] text-muted">{c.label}</span>
            </button>
          ),
        )}
      </div>

      {/* Link row */}
      <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-2 pl-4">
        <span className="flex-1 truncate text-sm text-muted">{url}</span>
        <button onClick={() => copy("link")} className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-medium hover:bg-ink/10">
          {copied === "link" ? "Copied" : "Copy"}
        </button>
      </div>

      {/* QR + calendar */}
      <div className="flex items-center gap-4 rounded-2xl border border-ink/5 bg-white/70 p-4">
        <div ref={qrWrap} className="rounded-xl bg-white p-2 shadow-soft">
          <QRCodeCanvas value={url} size={84} fgColor="#1b1226" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{qrLabel}</p>
          <p className="text-xs text-muted">Print it for the venue so guests scan to gift.</p>
          <button onClick={downloadQr} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium hover:border-brand/40">
            <Download className="h-3.5 w-3.5" /> Download QR
          </button>
        </div>
      </div>

      {calendar && (
        <div className="flex flex-wrap gap-2">
          <a href={googleCalendarUrl(calendar)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium hover:border-brand/40">
            <CalendarPlus className="h-3.5 w-3.5" /> Add to Google Calendar
          </a>
          <button onClick={() => downloadFile(`${title}.ics`, icsContent(calendar), "text/calendar")} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium hover:border-brand/40">
            <CalendarPlus className="h-3.5 w-3.5" /> Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
