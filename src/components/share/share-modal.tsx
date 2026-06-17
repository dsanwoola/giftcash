"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ShareHub } from "./share-hub";
import type { CalendarEvent } from "@/lib/share";

export function ShareModal({
  open,
  onClose,
  url,
  title,
  heading = "Share this",
  defaultMessage,
  calendar,
  qrLabel,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  heading?: string;
  defaultMessage: string;
  calendar?: CalendarEvent;
  qrLabel?: string;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlay}
          className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === overlay.current) onClose(); }}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">{heading}</h3>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-ink/5 hover:bg-ink/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ShareHub url={url} title={title} defaultMessage={defaultMessage} calendar={calendar} qrLabel={qrLabel} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
