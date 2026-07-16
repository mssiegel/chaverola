/**
 * Dev-only time compression for the demo engines' timers, so runtime
 * verification doesn't wait out the real-time demo (the hero script, the
 * ~20s lobby auto-pair, the 2-minute reconnect window). Off (scale 1)
 * unless BOTH hold: a dev build (`import.meta.env.DEV` — Vite compiles the
 * whole mechanism out of production) AND the page was loaded with `?fast`
 * (bare `?fast` = 10x, or `?fast=<n>`, clamped 1-100). Read once per full
 * document load: SPA navigation keeps it, a fresh page load needs the param
 * again. Scales only simulated-backend delays — never real-user timing like
 * the live-settings typing debounce. See DECISIONS.md → "Fast timers".
 */
function readTimeScale(): number {
  if (!import.meta.env.DEV) return 1;
  if (typeof window === "undefined") return 1;
  const raw = new URLSearchParams(window.location.search).get("fast");
  if (raw === null) return 1;
  const parsed = Number(raw);
  if (raw === "" || !Number.isFinite(parsed)) return 10;
  return Math.min(100, Math.max(1, parsed));
}

export const TIME_SCALE = readTimeScale();

/** Compress a demo delay; floors at 1ms so timer ordering never inverts. */
export const scaledMs = (ms: number) =>
  Math.max(1, Math.round(ms / TIME_SCALE));
