import { randomBytes, randomUUID } from "node:crypto";

import { MAX_STUDENTS_PER_ACTIVITY } from "@chaverola/shared";
import type { QueueEntry, StudentAuth } from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import { toQueueEntry } from "../store/projections";

/*
  The seat lifecycle, pure and io-free: every state transition on an
  activity's seats lives here, testable without a socket in sight. lobby.ts
  owns the io server and supplies the timer callbacks; this module owns the
  seat records and the timer handles. The seats hang off StoredActivity, so
  the activity's lifecycle owns the seats' lifecycle.
*/

/** A server-internal seat. Never on the wire — projections.ts decides what
 *  leaves (and the token never does). */
export interface Seat {
  studentId: string;
  token: string;
  name: string;
  joinedAt: number;
  connected: boolean;
  /** The socket that owns the seat RIGHT NOW. On a refresh the new socket
   *  can resume before the old socket's disconnect fires — disconnect
   *  handling and grace expiry must no-op unless the leaving socket still
   *  owns the seat, or a stale disconnect reaps a live student. */
  currentSocketId: string;
  /** On the ended screen after their chat ended — off the queue and
   *  unmatchable until their lobby:back tap (returnToQueue). */
  wrappingUp: boolean;
  disconnectedAt?: number;
  nonce?: string;
  timers: { broadcast?: NodeJS.Timeout; grace?: NodeJS.Timeout };
}

export interface ActivitySeats {
  byId: Map<string, Seat>;
  /** nonce → studentId: a fresh join replayed (StrictMode double-mount, or
   *  a refresh before lobby:welcome persisted) resumes instead of
   *  duplicating. */
  byNonce: Map<string, string>;
  /** Removed seats' tokens. A reconnect with one gets the distinguishable
   *  "removed" rejection instead of silently rejoining. Never counts
   *  against the cap; dies with the activity. */
  tombstonedTokens: Set<string>;
}

export function createSeatState(): ActivitySeats {
  return { byId: new Map(), byNonce: new Map(), tombstonedTokens: new Set() };
}

export type SeatResult =
  | { kind: "seated" | "resumed"; seat: Seat; evictSocketId?: string }
  | { kind: "rejected"; code: "removed" | "full" | "invalid" };

/**
 * Seat or resume a student socket. Precedence: tombstoned token → removed;
 * matching studentId+token → resume; known nonce → resume; otherwise a
 * fresh join (an unknown token with a live activity is a SILENT fresh join —
 * grace expired or the server restarted, both indistinguishable and fine).
 */
export function seatStudent(
  activity: StoredActivity,
  auth: StudentAuth,
  socketId: string,
  now: number
): SeatResult {
  const seats = activity.seats;

  if (auth.token !== undefined && seats.tombstonedTokens.has(auth.token)) {
    return { kind: "rejected", code: "removed" };
  }

  if (auth.studentId !== undefined && auth.token !== undefined) {
    const seat = seats.byId.get(auth.studentId);
    if (seat && seat.token === auth.token) {
      return resume(seat, socketId);
    }
  }

  if (auth.nonce !== undefined) {
    const studentId = seats.byNonce.get(auth.nonce);
    const seat = studentId ? seats.byId.get(studentId) : undefined;
    if (seat) return resume(seat, socketId);
    // The nonce's seat is gone (removed/reaped) — a dead mapping, not a
    // resume. Drop it and fall through to a fresh join.
    if (studentId !== undefined) seats.byNonce.delete(auth.nonce);
  }

  const name = auth.name?.trim();
  if (!name) return { kind: "rejected", code: "invalid" };
  if (seats.byId.size >= MAX_STUDENTS_PER_ACTIVITY) {
    return { kind: "rejected", code: "full" };
  }

  const seat: Seat = {
    studentId: randomUUID(),
    // Same shape as a hostKey: 18 random bytes → 24 base64url chars.
    token: randomBytes(18).toString("base64url"),
    name,
    joinedAt: now,
    connected: true,
    currentSocketId: socketId,
    wrappingUp: false,
    timers: {},
  };
  if (auth.nonce !== undefined) {
    seat.nonce = auth.nonce;
    seats.byNonce.set(auth.nonce, seat.studentId);
  }
  seats.byId.set(seat.studentId, seat);
  return { kind: "seated", seat };
}

/** Take over the seat: clear pending timers, keep the original wait clock.
 *  If another live socket held it (a duplicated tab), hand its id back so
 *  the caller can disconnect it. */
function resume(seat: Seat, socketId: string): SeatResult {
  clearSeatTimers(seat);
  const evictSocketId =
    seat.connected && seat.currentSocketId !== socketId
      ? seat.currentSocketId
      : undefined;
  seat.connected = true;
  seat.currentSocketId = socketId;
  delete seat.disconnectedAt;
  const result: SeatResult = { kind: "resumed", seat };
  if (evictSocketId !== undefined) result.evictSocketId = evictSocketId;
  return result;
}

/** Mark the seat dropped — no-op unless this socket still owns it (the
 *  currentSocketId guard). Returns the seat so the caller can arm timers. */
export function markDisconnected(
  activity: StoredActivity,
  socketId: string,
  now: number
): Seat | undefined {
  const seat = findBySocket(activity, socketId);
  if (!seat || !seat.connected) return undefined;
  seat.connected = false;
  seat.disconnectedAt = now;
  return seat;
}

/**
 * Arm the per-drop timers: the broadcast delay and the grace clock. Every
 * dropped seat arms both — matched or waiting, the same uniform grace
 * (what expiry means for a seat mid-chat is the caller's onGraceExpiry
 * business; this module stays chat-unaware). Both re-check that the drop
 * is still current before acting — a resume clears them, but belt over
 * suspenders. Both are unref'd: pending seat timers must never hold the
 * process open on SIGTERM.
 */
export function armDisconnectTimers(
  seat: Seat,
  graceMs: number,
  broadcastDelayMs: number,
  callbacks: { onBroadcastDelay: () => void; onGraceExpiry: () => void }
): void {
  seat.timers.broadcast = setTimeout(() => {
    seat.timers.broadcast = undefined;
    if (!seat.connected) callbacks.onBroadcastDelay();
  }, broadcastDelayMs);
  seat.timers.broadcast.unref();
  seat.timers.grace = setTimeout(() => {
    seat.timers.grace = undefined;
    if (!seat.connected) callbacks.onGraceExpiry();
  }, graceMs);
  seat.timers.grace.unref();
}

/** Intentional exit (lobby:leave): immediate removal, NO tombstone — a
 *  later rejoin is a legitimate fresh join. */
export function leaveSeat(
  activity: StoredActivity,
  socketId: string
): Seat | undefined {
  const seat = findBySocket(activity, socketId);
  if (!seat) return undefined;
  dropSeat(activity, seat);
  return seat;
}

/** Teacher remove: removal + tombstone, so the removed token can't silently
 *  rejoin. Idempotent — an absent seat is a no-op. */
export function removeSeat(
  activity: StoredActivity,
  studentId: string
): Seat | undefined {
  const seat = activity.seats.byId.get(studentId);
  if (!seat) return undefined;
  activity.seats.tombstonedTokens.add(seat.token);
  dropSeat(activity, seat);
  return seat;
}

/** Grace expired: the seat is reaped without a tombstone (a very late
 *  reconnect becomes a silent fresh join, by design). */
export function reapSeat(activity: StoredActivity, seat: Seat): void {
  dropSeat(activity, seat);
}

/** Their chat ended around them: off the queue and unmatchable until the
 *  ended screen's back tap. */
export function markWrappingUp(seat: Seat): void {
  seat.wrappingUp = true;
}

/** The lobby:back tap — back in line with a fresh wait clock. */
export function returnToQueue(seat: Seat, now: number): void {
  seat.wrappingUp = false;
  seat.joinedAt = now;
}

/** Teacher-facing queue, oldest join first. Skips wrappingUp seats and
 *  `exclude` (lobby.ts supplies matchedStudentIds — this module stays
 *  chat-unaware). */
export function toQueueEntries(
  activity: StoredActivity,
  now: number,
  exclude: ReadonlySet<string>
): QueueEntry[] {
  return [...activity.seats.byId.values()]
    .filter((seat) => !seat.wrappingUp && !exclude.has(seat.studentId))
    .sort(
      (a, b) => a.joinedAt - b.joinedAt || (a.studentId < b.studentId ? -1 : 1)
    )
    .map((seat) => toQueueEntry(seat, now));
}

export function clearSeatTimers(seat: Seat): void {
  if (seat.timers.broadcast) clearTimeout(seat.timers.broadcast);
  if (seat.timers.grace) clearTimeout(seat.timers.grace);
  seat.timers = {};
}

/** For activity removal (all three store paths) and resetForTests. */
export function clearAllSeatTimers(activity: StoredActivity): void {
  for (const seat of activity.seats.byId.values()) clearSeatTimers(seat);
}

function findBySocket(
  activity: StoredActivity,
  socketId: string
): Seat | undefined {
  for (const seat of activity.seats.byId.values()) {
    if (seat.currentSocketId === socketId) return seat;
  }
  return undefined;
}

function dropSeat(activity: StoredActivity, seat: Seat): void {
  clearSeatTimers(seat);
  activity.seats.byId.delete(seat.studentId);
  if (seat.nonce !== undefined) activity.seats.byNonce.delete(seat.nonce);
}
