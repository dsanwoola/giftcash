"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, X } from "lucide-react";
import { useState } from "react";

const steps = [
  { icon: "🔗", title: "Open the screen link", body: "On the device that drives your TV/projector, open the Big screen link below (or scan the QR with that device)." },
  { icon: "🖥️", title: "Connect to the display", body: "Easiest: a laptop in Chrome, fullscreen, via HDMI to the TV/projector. Or use a smart-TV browser, Chromecast/AirPlay, or a Fire TV / Android TV browser." },
  { icon: "🔊", title: "Wire up sound", body: "Plug the laptop's audio into the venue speakers/PA so the fanfare is heard. Sound turns on when you tap “Start the show”." },
  { icon: "📶", title: "Stay online", body: "The screen needs internet for live updates (venue Wi-Fi or a hotspot). Disable the device's sleep/screensaver." },
  { icon: "📱", title: "Control from your phone", body: "Open the Host console on your phone to show/hide the total, change the gift sound, and edit the goal — it updates the screen live." },
];

export function SetupGuide({ open, onClose, liveUrl }: { open: boolean; onClose: () => void; liveUrl: string }) {
  const overlay = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(liveUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlay}
          className="fixed inset-0 z-50 grid place-items-end bg-ink/50 sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === overlay.current) onClose(); }}
        >
          <motion.div
            initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-6 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Set up the big screen</h3>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
            </div>

            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-2xl border border-ink/5 bg-white/70 p-3">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{i + 1}. {s.title}</p>
                    <p className="text-xs text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3">
              <div className="rounded-lg border border-ink/5 p-1.5"><QRCodeSVG value={liveUrl} size={72} fgColor="#1b1226" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">Big screen link</p>
                <p className="truncate text-sm">{liveUrl}</p>
                <button onClick={copy} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy link"}</button>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted">It&apos;s self-serve — no account needed on the screen. You only need help with the physical HDMI/projector if the venue handles that.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
