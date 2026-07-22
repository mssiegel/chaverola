import { getByJoinCode } from "../store/activityStore";
import type { LobbyContext } from "./lobbyContext";
import { createChat, findAutoMatchPair } from "./matching";
import { timing } from "./timing";

/*
  The auto-match timer, module-scoped so it outlives any single teacher
  socket (a reconnect re-arms the same activity's interval rather than
  double-arming it). Everything the tick decides on — the record, settings,
  eligibility, the pairing gap — is read fresh from the store each firing;
  the timer state here holds only the handle, the teacher refcount, and the
  breather gate.
*/

/** joinCode → the auto-match interval. Armed on an activity's 0→1st teacher
 *  socket, cleared on its last teacher disconnect and on activity removal —
 *  auto-match runs only while a teacher is connected (founder call: a
 *  closed laptop shouldn't keep pairing students). Everything else — the
 *  record, settings, eligibility, the pairing gap — is read inside the
 *  tick, so settings edits, seat changes, and manual pairing never touch
 *  the timer itself. */
const autoMatchTimers = new Map<
  string,
  { timer: NodeJS.Timeout; teacherCount: number; nextAt: number }
>();

function autoMatchTick(ctx: LobbyContext, joinCode: string): void {
  const state = autoMatchTimers.get(joinCode);
  if (!state) return;
  const record = getByJoinCode(joinCode); // never refreshes the TTL
  if (!record || !record.settings.autoMatch) return;
  if (record.pausedAt !== null) return; // matchmaking waits out a pause
  const now = Date.now();
  if (now < state.nextAt) return;
  const pair = findAutoMatchPair(
    record,
    // The teacher-set threshold compresses with the world — a scaled dev
    // run auto-matches in seconds, not the real 20.
    record.settings.autoMatchSeconds / timing.scale,
    now
  );
  if (!pair) return;
  const chat = createChat(record, pair, now);
  if (!chat) return;
  ctx.log.info({ joinCode, chatId: chat.id }, "auto-matched a pair");
  // One pair per firing, with a breather — pairs land one at a time.
  state.nextAt = now + timing.autoMatchGapMs;
  ctx.sendChatStarted(record, chat);
  ctx.broadcastState(record);
}

/** Arm on the 0→1st teacher socket: a 1s tick (scaled) that reads
 *  everything else fresh each firing. */
export function armAutoMatch(ctx: LobbyContext, joinCode: string): void {
  const state = autoMatchTimers.get(joinCode);
  if (state) {
    state.teacherCount += 1;
    return;
  }
  const timer = setInterval(
    () => autoMatchTick(ctx, joinCode),
    timing.autoMatchTickMs
  );
  timer.unref();
  autoMatchTimers.set(joinCode, { timer, teacherCount: 1, nextAt: 0 });
}

/** The last teacher disconnecting stops the timer (reconnect re-arms). */
export function releaseAutoMatch(joinCode: string): void {
  const state = autoMatchTimers.get(joinCode);
  if (!state) return;
  state.teacherCount -= 1;
  if (state.teacherCount > 0) return;
  clearInterval(state.timer);
  autoMatchTimers.delete(joinCode);
}

/** Activity removal: stop the interval outright, whatever the refcount —
 *  the activity is gone, so nothing it was pairing exists anymore. */
export function clearAutoMatch(joinCode: string): void {
  const state = autoMatchTimers.get(joinCode);
  if (!state) return;
  clearInterval(state.timer);
  autoMatchTimers.delete(joinCode);
}
