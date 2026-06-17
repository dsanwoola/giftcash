"use client";

import type { SoundTheme } from "./types";
export type { SoundTheme };

/**
 * Party-screen sound, synthesized with the Web Audio API — no audio files.
 * Browsers block autoplay until a user gesture, so call `unlockAudio()` from a
 * click (the "Start show" button) before relying on `playFanfare()`.
 */

let ctx: AudioContext | null = null;
let enabled = false;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call inside a user gesture to allow sound to play. */
export async function unlockAudio() {
  const a = audio();
  if (!a) return;
  if (a.state === "suspended") await a.resume();
  enabled = true;
}

export const soundEnabled = () => enabled;

function tone(
  a: AudioContext,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  gain = 0.25,
) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(a.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

const bell = (a: AudioContext, f: number, s: number, d: number, g = 0.25) => tone(a, "triangle", f, s, d, g);

/* ----- Selectable gift sound themes (host picks on the party screen) ----- */
export const SOUND_THEMES: { id: SoundTheme; label: string; emoji: string }[] = [
  { id: "fanfare", label: "Fanfare", emoji: "🎺" },
  { id: "chime", label: "Chimes", emoji: "🔔" },
  { id: "arcade", label: "Arcade", emoji: "🕹️" },
  { id: "boom", label: "Boom", emoji: "🥁" },
];

/** A short ascending fanfare to announce a new gift (default theme). */
export function playFanfare() {
  const a = audio();
  if (!a || !enabled) return;
  const t = a.currentTime;
  // Major arpeggio C5–E5–G5–C6 + a shimmer on top.
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => bell(a, f, t + i * 0.11, 0.6, 0.22));
  bell(a, 1567.98, t + 0.44, 1.1, 0.12); // sparkle G6
}

/** Play the gift sound for the chosen theme. */
export function playGiftSound(theme: SoundTheme = "fanfare") {
  const a = audio();
  if (!a || !enabled) return;
  const t = a.currentTime;
  switch (theme) {
    case "chime": {
      // Gentle descending glass bells.
      [1318.5, 1046.5, 880, 659.25].forEach((f, i) => bell(a, f, t + i * 0.13, 1.0, 0.16));
      break;
    }
    case "arcade": {
      // 8-bit ascending coin blips.
      [659.25, 880, 1174.7, 1318.5, 1760].forEach((f, i) => tone(a, "square", f, t + i * 0.07, 0.16, 0.09));
      break;
    }
    case "boom": {
      // Deep drum thump + bright sparkle.
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(g).connect(a.destination);
      osc.start(t); osc.stop(t + 0.65);
      bell(a, 1318.5, t + 0.12, 0.8, 0.14);
      bell(a, 1975.5, t + 0.24, 0.8, 0.1);
      break;
    }
    default:
      playFanfare();
  }
}

/** A rising "whoosh" as the envelope flies in. */
export function playWhoosh() {
  const a = audio();
  if (!a || !enabled) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.4);
}
