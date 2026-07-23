import { sendTranscriptEmail } from "../email/sendTranscript";
import { getByJoinCode } from "../store/activityStore";
import type { LobbyContext } from "./lobbyContext";
import { timing } from "./timing";

/*
  The best-effort transcript fallback (feature 11 prompt 4): the teacher who
  closes the laptop without clicking End still gets their transcripts.

  Armed on every teacher disconnect (re-arm replaces, so the clock always
  measures from the LAST one), it fires ~10 minutes later — but the "is a
  teacher actually gone?" question is answered at fire time, not arm time. That
  keeps the whole check in one place: a reconnect, or a second host tab that was
  never closed, simply means a teacher is still connected when the timer fires,
  so it does nothing. Ten minutes on, the disconnecting socket is long gone, so
  the scan needs no socket-id exclusion.

  Best-effort by design: the server is a single free-tier instance that spins
  down when idle, so anything on a longer timer would routinely be lost. Ten
  minutes is short enough that the process is usually still alive. The send-once
  guard in sendTranscriptEmail makes a later explicit End safe — at most one
  email per activity.
*/

/** joinCode → the pending fallback timeout. At most one per activity (arm
 *  cancels any existing one first). unref'd, so it never keeps the process up. */
const fallbackTimers = new Map<string, NodeJS.Timeout>();

function aTeacherIsConnected(ctx: LobbyContext, joinCode: string): boolean {
  for (const socket of ctx.io.sockets.sockets.values()) {
    if (socket.data.role === "teacher" && socket.data.joinCode === joinCode) {
      return true;
    }
  }
  return false;
}

/** Arm (or re-arm, replacing any pending timer) the fallback for one activity.
 *  Fires once, timing.transcriptFallbackMs from now. */
export function armTranscriptFallback(
  ctx: LobbyContext,
  joinCode: string
): void {
  cancelTranscriptFallback(joinCode);
  const timer = setTimeout(() => {
    fallbackTimers.delete(joinCode);
    // getByJoinCode never refreshes the TTL — the fallback must not keep a
    // dead activity alive.
    const record = getByJoinCode(joinCode);
    if (!record) return;
    // A teacher came back (or never fully left — a second host tab): they can
    // end it themselves, so the fallback bows out.
    if (aTeacherIsConnected(ctx, joinCode)) return;
    ctx.log.info({ joinCode }, "transcript fallback fired");
    // Fire-and-forget: sendTranscriptEmail owns its own try/catch, the
    // send-once guard, and the no-email / silent / already-sent skips.
    void sendTranscriptEmail(record, ctx.mailer, ctx.log);
  }, timing.transcriptFallbackMs);
  timer.unref();
  fallbackTimers.set(joinCode, timer);
}

/** Cancel a pending fallback — on activity removal, and inside arm's re-arm. */
export function cancelTranscriptFallback(joinCode: string): void {
  const timer = fallbackTimers.get(joinCode);
  if (!timer) return;
  clearTimeout(timer);
  fallbackTimers.delete(joinCode);
}
