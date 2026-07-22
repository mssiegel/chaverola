import {
  activeMembersBy,
  dealCast,
  pairEveryonePlan,
  pickAutoMatchPair,
  stuckInLineNotice,
} from "@chaverola/shared";
import type { LobbyConnectionState } from "@chaverola/shared";

import { nextId, randInt } from "@/lib/random";
import { HOST_SEED_CHATS, HOST_STUDENT_NAMES } from "@/mockData";
import type { HostedActivity } from "@/types/activity";
import type {
  ChatEndReason,
  ChatMessage,
  ChatStatus,
  Participant,
} from "@/types/chat";

/*
  The host page's world model: the pure simulation state and rules behind
  useHostActivityDemo (same directory). No React in here — the hook owns
  timers and state; these functions just turn one world into the next, which
  also makes the pairing/rematch/clock rules unit-testable.
*/

/** How long a new joiner takes to show up after the previous one. */
export const JOIN_GAP_MIN_SECONDS = 7;
export const JOIN_GAP_MAX_SECONDS = 15;

/** How long a fake student lingers on the ended screen before returning. */
export const RETURN_MIN_SECONDS = 4;
export const RETURN_MAX_SECONDS = 10;

/** Breather between simulated auto-matches so pairs land one at a time. */
export const AUTO_MATCH_GAP_SECONDS = 3;

export interface WaitingStudent {
  id: string;
  realName: string;
  /** Seconds since they entered (or came back to) the queue. */
  waitSeconds: number;
  /**
   * "reconnecting" marks a dropped student whose seat is in its grace
   * window. The row dims but the clock keeps ticking (the seat is still
   * theirs), and they are fully unmatchable — excluded from auto-match,
   * pair-everyone, and manual selection alike (founder call, 2026-07-19);
   * the row's only action is Remove.
   */
  connection: LobbyConnectionState;
}

/** One chat as the host page tracks it. `participants[].id` is the student id. */
export interface HostedChat {
  id: string;
  /** Everyone who was ever in the room — lines and colors outlive a removal. */
  participants: Participant[];
  /** Students removed mid-chat (quiet exit) — no longer in the room. */
  inactiveStudentIds: string[];
  messages: ChatMessage[];
  status: ChatStatus;
  /** Why it ended; reaches students as their wrap-up copy. */
  endReason: ChatEndReason | null;
  /** Seconds left on this chat's auto-end clock (null: no clock). */
  autoEndSecondsLeft: number | null;
  /** Active members currently riding a dropped connection — live only; the
   *  demo never sets it (its wifi-blip simulation lives on queue rows). */
  reconnectingStudentIds?: readonly string[];
  /** Seconds since the chat started — live only; drives the card's
   *  count-up chip. The demo shows the auto-end countdown instead. */
  elapsedSeconds?: number;
}

export interface RosterStudent {
  id: string;
  realName: string;
}

export interface HostWorld {
  queue: WaitingStudent[];
  chats: HostedChat[];
  /** Ended-chat students who haven't tapped back to the lobby yet. */
  wrappingUp: { student: RosterStudent; secondsUntilReturn: number }[];
  /** studentId → everyone in their previous chat. One round deep on purpose. */
  lastPartners: Record<string, string[]>;
  /** Students who haven't joined yet; the join simulation pops these. */
  joinPool: RosterStudent[];
  secondsUntilNextJoin: number;
  secondsUntilAutoMatch: number;
  /** Pair-everyone's odd one out, highlighted as first in line. */
  leftoverStudentId: string | null;
  /** Pair-everyone had to repeat a pairing; shown in the rail, dismissible. */
  rematchNotice: string | null;
  /**
   * The teacher paused the whole activity. World-level on purpose — there is
   * no per-chat pause (see DECISIONS.md). While true, tickWorld holds every
   * clock (wait times, auto-end, the auto-match countdown) but keeps joins
   * and lobby returns flowing; chats created during a pause are born frozen
   * simply because the world is.
   */
  paused: boolean;
}

/** The members still actually in the room. */
export function activeChatMembers(chat: HostedChat): Participant[] {
  return activeMembersBy(
    chat.participants,
    chat.inactiveStudentIds,
    (p) => p.id
  );
}

/**
 * Seat students on the activity's characters: a chat of N always uses the
 * roster's first N characters (that's the promise the setup form makes about
 * characters 3 and 4), and WHO gets WHICH is random — there's no assignment
 * step; the teacher sees who got whom on the chat card.
 */
function assignCharacters(
  students: RosterStudent[],
  activity: HostedActivity
): Participant[] {
  const cast = dealCast(activity.characters, students.length);
  return students.map((student, index) => ({
    id: student.id,
    realName: student.realName,
    // `cast` and `students` are the same length by construction.
    character: cast[index]!,
  }));
}

export function createChat(
  w: HostWorld,
  studentIds: string[],
  activity: HostedActivity
): HostWorld {
  // A reconnecting student can't be seated, whoever asks — the structural
  // backstop for the unmatchable rule on WaitingStudent.connection.
  const members = w.queue.filter(
    (s) => studentIds.includes(s.id) && s.connection === "connected"
  );
  if (members.length < 2) return w;
  const chat: HostedChat = {
    id: nextId("host-chat"),
    participants: assignCharacters(members, activity),
    inactiveStudentIds: [],
    messages: [],
    status: "active",
    endReason: null,
    autoEndSecondsLeft: activity.settings.autoEndChats
      ? activity.settings.autoEndMinutes * 60
      : null,
  };
  // The rematch memory is one round deep: starting a chat overwrites each
  // member's previous partners with this room.
  const lastPartners = { ...w.lastPartners };
  members.forEach((m) => {
    lastPartners[m.id] = members.filter((o) => o.id !== m.id).map((o) => o.id);
  });
  return {
    ...w,
    queue: w.queue.filter((s) => !studentIds.includes(s.id)),
    chats: [...w.chats, chat],
    lastPartners,
    leftoverStudentId:
      w.leftoverStudentId && studentIds.includes(w.leftoverStudentId)
        ? null
        : w.leftoverStudentId,
  };
}

/** End a chat for everyone in it; its students head to the ended screen. */
export function endChatIn(
  w: HostWorld,
  chatId: string,
  reason: ChatEndReason
): HostWorld {
  const chat = w.chats.find((c) => c.id === chatId);
  if (!chat || chat.status !== "active") return w;
  const ended: HostedChat = {
    ...chat,
    status: "ended",
    endReason: reason,
    autoEndSecondsLeft: null,
  };
  return {
    ...w,
    chats: w.chats.map((c) => (c.id === chatId ? ended : c)),
    // Students are never sent back to the lobby automatically — the fake
    // ones "click back" after a moment; until then they don't count as
    // waiting, exactly like real ones wouldn't.
    wrappingUp: [
      ...w.wrappingUp,
      ...activeChatMembers(chat).map((p) => ({
        student: { id: p.id, realName: p.realName },
        secondsUntilReturn: randInt(RETURN_MIN_SECONDS, RETURN_MAX_SECONDS),
      })),
    ],
  };
}

/**
 * First queue pair that has waited long enough: fully fresh partners when any
 * exist, then anyone who wouldn't be rerunning their own last chat exactly.
 * An exact-rematch pair is never made — they wait for someone new.
 */
export function findAutoMatchPair(
  queue: WaitingStudent[],
  thresholdSeconds: number,
  lastPartners: Record<string, string[]>
): [WaitingStudent, WaitingStudent] | null {
  const ready = queue.filter(
    (s) => s.connection === "connected" && s.waitSeconds >= thresholdSeconds
  );
  const pick = pickAutoMatchPair(
    ready.map((s) => s.id),
    lastPartners
  );
  if (!pick) return null;
  // pickAutoMatchPair draws both ids from `ready`, so both rows resolve.
  return [
    ready.find((s) => s.id === pick[0])!,
    ready.find((s) => s.id === pick[1])!,
  ];
}

/**
 * Pair the whole connected queue at once through the shared `pairEveryonePlan`
 * (fresh-first greedy, swap-repair around exact reruns, the odd-count trio /
 * leftover). An exact pair/trio the plan couldn't repair stays in line with a
 * dismissible `rematchNotice`; the odd one out becomes `leftoverStudentId`.
 */
export function pairEveryoneIn(
  w: HostWorld,
  activity: HostedActivity
): HostWorld {
  // Reconnecting students stay in line, untouched — unmatchable while their
  // seat rides out the grace window. The decision itself (fresh-first
  // greedy, swap-repair, the stuck pair/trio) is the shared plan; this just
  // maps its ids back to seats and folds createChat over the groups.
  const pool = w.queue.filter((s) => s.connection === "connected");
  const plan = pairEveryonePlan(
    pool.map((s) => s.id),
    activity.characters.length,
    w.lastPartners
  );
  if (!plan) return w;

  let next = w;
  for (const group of plan.groups) {
    next = createChat(next, group, activity);
  }

  const nameOf = (id: string) => pool.find((s) => s.id === id)?.realName ?? "";
  return {
    ...next,
    leftoverStudentId: plan.leftoverId,
    rematchNotice:
      plan.stuckIds.length > 0
        ? stuckInLineNotice(plan.stuckIds.map(nameOf))
        : null,
  };
}

/** One second of simulated classroom. */
export function tickWorld(w: HostWorld, activity: HostedActivity): HostWorld {
  const settings = activity.settings;
  // While paused, every clock holds — wait times, auto-end, the auto-match
  // countdown — so resume picks up exactly where the pause landed and never
  // fires a burst of auto-matches. Gated per block, not an early return:
  // joins and lobby returns below keep flowing (they aren't chat activity).
  let queue = w.paused
    ? w.queue
    : w.queue.map((s) => ({ ...s, waitSeconds: s.waitSeconds + 1 }));

  // Per-chat auto-end clocks. At zero the chat ends with reason "timer" —
  // students get the ⏰ "Time's up!" copy, never the generic one. A paused
  // world's clocks don't move, so nothing can expire mid-pause.
  const expiring: HostedChat[] = [];
  const chats = w.paused
    ? w.chats
    : w.chats.map((chat) => {
        if (chat.status !== "active" || chat.autoEndSecondsLeft === null) {
          return chat;
        }
        const left = chat.autoEndSecondsLeft - 1;
        if (left > 0) return { ...chat, autoEndSecondsLeft: left };
        expiring.push(chat);
        return chat;
      });

  let wrappingUp = w.wrappingUp;

  // Ended-screen students tapping "back to the lobby": they re-join the
  // queue at the bottom with a fresh wait time.
  const returning: RosterStudent[] = [];
  wrappingUp = wrappingUp.flatMap((entry) => {
    if (entry.secondsUntilReturn <= 1) {
      returning.push(entry.student);
      return [];
    }
    return [{ ...entry, secondsUntilReturn: entry.secondsUntilReturn - 1 }];
  });
  if (returning.length > 0) {
    queue = [
      ...queue,
      ...returning.map((s) => ({
        ...s,
        waitSeconds: 0,
        connection: "connected" as const,
      })),
    ];
  }

  // New students joining over time — they append at the bottom.
  let joinPool = w.joinPool;
  let secondsUntilNextJoin = w.secondsUntilNextJoin;
  if (joinPool.length > 0) {
    secondsUntilNextJoin -= 1;
    if (secondsUntilNextJoin <= 0) {
      const [joiner, ...rest] = joinPool;
      queue = [
        ...queue,
        { ...joiner!, waitSeconds: 0, connection: "connected" as const },
      ];
      joinPool = rest;
      secondsUntilNextJoin = randInt(
        JOIN_GAP_MIN_SECONDS,
        JOIN_GAP_MAX_SECONDS
      );
    }
  }

  let next: HostWorld = {
    ...w,
    queue,
    chats,
    wrappingUp,
    joinPool,
    secondsUntilNextJoin,
    secondsUntilAutoMatch: w.paused
      ? w.secondsUntilAutoMatch
      : Math.max(0, w.secondsUntilAutoMatch - 1),
  };

  for (const chat of expiring) {
    next = endChatIn(next, chat.id, "timer");
  }

  // Setting #4: waiting students past the threshold pair up on their own,
  // 1:1, never as an exact rerun. One pair at a time so the rail reads.
  if (!w.paused && settings.autoMatch && next.secondsUntilAutoMatch === 0) {
    const pair = findAutoMatchPair(
      next.queue,
      settings.autoMatchSeconds,
      next.lastPartners
    );
    if (pair) {
      next = createChat(next, [pair[0].id, pair[1].id], activity);
      next.secondsUntilAutoMatch = AUTO_MATCH_GAP_SECONDS;
    }
  }

  // The leftover highlight only makes sense while that student still waits.
  if (
    next.leftoverStudentId &&
    !next.queue.some((s) => s.id === next.leftoverStudentId)
  ) {
    next = { ...next, leftoverStudentId: null };
  }

  return next;
}

/** Boot the demo classroom: 2 chats going, 2 finished, 6 waiting, more coming. */
export function seedWorld(activity: HostedActivity): HostWorld {
  const roster: RosterStudent[] = HOST_STUDENT_NAMES.map((realName) => ({
    id: nextId("student"),
    realName,
  }));
  let cursor = 0;

  const chats: HostedChat[] = [];
  const lastPartners: Record<string, string[]> = {};
  const queue: WaitingStudent[] = [];

  for (const seed of HOST_SEED_CHATS) {
    // A teacher-made activity may have fewer characters than a seed wants
    // (a quad needs 4); clamp the chat to the roster and keep the spare
    // students for the queue instead of crashing the demo.
    const size = Math.min(seed.size, activity.characters.length);
    const students = roster.slice(cursor, cursor + size);
    cursor += size;
    if (students.length < 2) continue;

    const participants = assignCharacters(students, activity);
    const active = seed.status === "active";
    chats.push({
      id: nextId("host-chat"),
      participants,
      inactiveStudentIds: [],
      messages: seed.lines
        .filter((line) => line.seat < participants.length)
        .map((line) => ({
          id: nextId("m"),
          // The seat index is clamped to the participants just built.
          senderId: participants[line.seat]!.id,
          text: line.text,
        })),
      status: seed.status,
      endReason: seed.endReason,
      // In-progress seeds join mid-round, so their clocks are partly spent.
      autoEndSecondsLeft:
        active && activity.settings.autoEndChats
          ? Math.max(
              90,
              activity.settings.autoEndMinutes * 60 - randInt(90, 200)
            )
          : null,
    });
    students.forEach((s) => {
      lastPartners[s.id] = students
        .filter((o) => o.id !== s.id)
        .map((o) => o.id);
    });
    // Completed chats' students are already back in the queue — with their
    // rematch memory set, so the warning is demoable from the first tap.
    if (!active) {
      students.forEach((s) =>
        queue.push({ ...s, waitSeconds: 0, connection: "connected" })
      );
    }
  }

  // Longest-waiting on top, staggered so the wait times read naturally —
  // and all below the default auto-match threshold, so the teacher gets a
  // beat to look around before the simulation starts pairing on its own.
  queue.forEach((entry, index) => {
    entry.waitSeconds = Math.max(3, 14 - index * 2);
  });

  return {
    queue,
    chats,
    wrappingUp: [],
    lastPartners,
    joinPool: roster.slice(cursor),
    secondsUntilNextJoin: randInt(JOIN_GAP_MIN_SECONDS, JOIN_GAP_MAX_SECONDS),
    secondsUntilAutoMatch: AUTO_MATCH_GAP_SECONDS,
    leftoverStudentId: null,
    rematchNotice: null,
    paused: false,
  };
}
