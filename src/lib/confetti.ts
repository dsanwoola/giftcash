import confetti from "canvas-confetti";

const BRAND = ["#6429c9", "#e6b143", "#f25c9e", "#0ea271", "#fff3c4"];

/** A single celebratory burst from the centre. */
export function burst() {
  confetti({
    particleCount: 140,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: BRAND,
    scalar: 1.1,
    disableForReducedMotion: true,
  });
}

/** A sustained celebration — the big reveal moment. */
export function celebrate(durationMs = 2200) {
  const end = Date.now() + durationMs;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors: BRAND, disableForReducedMotion: true });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors: BRAND, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  burst();
}

/** Fireworks shells for the fireworks theme. */
export function fireworks(durationMs = 2600) {
  const end = Date.now() + durationMs;
  const interval = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    confetti({
      particleCount: 60,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
      colors: BRAND,
      disableForReducedMotion: true,
    });
  }, 320);
}
