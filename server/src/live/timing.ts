import {
  AUTO_MATCH_GAP_SECONDS,
  LOBBY_DISCONNECT_BROADCAST_DELAY_MS,
  LOBBY_GRACE_SECONDS,
} from "@chaverola/shared";

/*
  The lobby's real-flow clocks, in one place, pre-divided by the config's
  timeScale (CHAVEROLA_TIME_SCALE — dev-only; production is pinned to 1 in
  readTimeScale). A module singleton, not parameter threading, because
  projections.ts is pure and widely called — threading a scale through every
  projector call site would be churn for a dev knob.

  What deliberately does NOT scale: the chat:send rate-limit window (abuse
  guard, not a flow clock), the TYPING_* heartbeat/TTL (client-paced), the
  teacher keepalive (TTL bookkeeping), the store TTL/sweep (activity
  lifetime), and the client's LEAVE_FLUSH_MS (a network allowance, not a
  countdown).
*/

interface Timing {
  /** The applied scale — auto-match thresholds divide by this too. */
  scale: number;
  /** The dropped-seat reap window (LOBBY_GRACE_SECONDS, scaled, in ms). */
  graceMs: number;
  /** The "lost connection" broadcast gate
   *  (LOBBY_DISCONNECT_BROADCAST_DELAY_MS, scaled). */
  broadcastDelayMs: number;
  /** The breather between auto-match pairings (AUTO_MATCH_GAP_SECONDS,
   *  scaled). */
  autoMatchGapMs: number;
  /** The auto-match interval's firing rate (1s at scale 1). */
  autoMatchTickMs: number;
  /** engine.io's defaults made explicit so they can scale — the ping cycle
   *  is what bounds dead-connection detection (~45s unscaled). */
  pingIntervalMs: number;
  pingTimeoutMs: number;
}

function derive(scale: number): Timing {
  // Floor 50ms: a sub-50ms timer is indistinguishable from timer jitter.
  const scaled = (ms: number) => Math.max(50, Math.round(ms / scale));
  return {
    scale,
    graceMs: scaled(LOBBY_GRACE_SECONDS * 1000),
    broadcastDelayMs: scaled(LOBBY_DISCONNECT_BROADCAST_DELAY_MS),
    autoMatchGapMs: scaled(AUTO_MATCH_GAP_SECONDS * 1000),
    autoMatchTickMs: scaled(1000),
    pingIntervalMs: scaled(25_000),
    pingTimeoutMs: scaled(20_000),
  };
}

/** Read, never reassigned — applyTimeScale mutates in place so every
 *  importer's binding stays live. */
export const timing: Timing = derive(1);

/** attachLobby calls this first thing with config.timeScale. Last-write-wins
 *  by design: tests that attach a second scaled lobby re-apply scale 1 in
 *  the shared beforeEach. */
export function applyTimeScale(scale: number): void {
  Object.assign(timing, derive(scale));
}
