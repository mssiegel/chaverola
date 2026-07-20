import type { LobbyConnectionState } from "@chaverola/shared";

import { nextId, randInt, shuffled } from "@/lib/random";
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
  return chat.participants.filter(
    (p) => !chat.inactiveStudentIds.includes(p.id)
  );
}

function wereLastPartnersIn(
  lastPartners: Record<string, string[]>,
  aId: string,
  bId: string
): boolean {
  return lastPartners[aId]?.includes(bId) ?? false;
}

/** Fresh both ways: neither student's previous chat included the other. */
function isFreshPair(
  lastPartners: Record<string, string[]>,
  aId: string,
  bId: string
): boolean {
  return (
    !wereLastPartnersIn(lastPartners, aId, bId) &&
    !wereLastPartnersIn(lastPartners, bId, aId)
  );
}

/**
 * True only when EVERY member's previous chat was exactly this group. A
 * partial overlap — Bob's last chat was Rachel, but Rachel has chatted since —
 * doesn't count: nobody would be rerunning their own last round.
 */
export function isExactRematchIn(
  lastPartners: Record<string, string[]>,
  ids: string[]
): boolean {
  if (ids.length < 2) return false;
  return ids.every((id) => {
    const last = lastPartners[id];
    return (
      last !== undefined &&
      last.length === ids.length - 1 &&
      ids.every((other) => other === id || last.includes(other))
    );
  });
}

/** "A and B" / "A, B, and C" — shared by the heads-up and the rail notice. */
export function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
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
  const cast = shuffled(activity.characters.slice(0, students.length));
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
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      // Both loop indexes are within bounds.
      if (isFreshPair(lastPartners, ready[i]!.id, ready[j]!.id)) {
        return [ready[i]!, ready[j]!];
      }
    }
  }
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      if (!isExactRematchIn(lastPartners, [ready[i]!.id, ready[j]!.id])) {
        return [ready[i]!, ready[j]!];
      }
    }
  }
  return null;
}

/**
 * Pair the whole queue at once: greedy in queue order, preferring fully fresh
 * partners, then anyone who wouldn't be rerunning their own previous chat
 * exactly. An exact rematch is never created — a stranded pair gets repaired
 * by one swap with a pairing already made, and only when the queue IS exactly
 * that pair (or an exact trio) do they stay in line, with `rematchNotice`
 * saying why. An odd queue seats the last three as a group when the activity
 * has a 3rd character; otherwise the newest joiner stays first in line as
 * `leftoverStudentId`.
 */
export function pairEveryoneIn(
  w: HostWorld,
  activity: HostedActivity
): HostWorld {
  const lp = w.lastPartners;
  // Reconnecting students stay in line, untouched — unmatchable while
  // their seat rides out the grace window.
  const pool = w.queue.filter((s) => s.connection === "connected");
  if (pool.length < 2) return w;
  let leftover: WaitingStudent | null = null;
  let trio: WaitingStudent[] | null = null;
  if (pool.length % 2 === 1) {
    if (activity.characters.length >= 3) {
      // Odd count with a 3rd character: the last three form a group so
      // nobody sits out.
      trio = pool.splice(pool.length - 3, 3);
    } else {
      // Only two characters: the newest joiner stays first in line.
      leftover = pool.pop() ?? null;
    }
  }

  const pairs: [WaitingStudent, WaitingStudent][] = [];
  while (pool.length >= 2) {
    const a = pool.shift()!;
    let index = pool.findIndex((b) => isFreshPair(lp, a.id, b.id));
    if (index === -1) {
      index = pool.findIndex((b) => !isExactRematchIn(lp, [a.id, b.id]));
    }
    if (index === -1) {
      // Exactness is mutual and one round deep, so a can only be exact with
      // one student — the pool is down to a's previous 1:1 partner.
      pool.unshift(a);
      break;
    }
    pairs.push([a, pool.splice(index, 1)[0]!]);
  }

  // A stranded pair's memories are pinned to each other, so seating either
  // of them with ANYONE else can't be an exact rerun — one swap always fixes
  // it. Only a queue of exactly these two has nobody to swap with.
  let stuck: WaitingStudent[] = [];
  if (pool.length === 2) {
    const [x, y] = pool as [WaitingStudent, WaitingStudent];
    const donor = pairs.pop();
    if (donor) {
      const [p, q] = donor;
      const freshCount = (m: [WaitingStudent, WaitingStudent][]) =>
        m.filter(([s, t]) => isFreshPair(lp, s.id, t.id)).length;
      const straight: [WaitingStudent, WaitingStudent][] = [
        [x, p],
        [y, q],
      ];
      const crossed: [WaitingStudent, WaitingStudent][] = [
        [x, q],
        [y, p],
      ];
      pairs.push(
        ...(freshCount(crossed) > freshCount(straight) ? crossed : straight)
      );
    } else if (trio) {
      // Trade a trio seat: the trio takes x, and the traded member pairs
      // with y — neither result can be an exact rerun.
      const traded = trio.pop()!;
      trio.push(x);
      pairs.push([traded, y]);
    } else if (leftover) {
      const seated = isFreshPair(lp, x.id, leftover.id) ? x : y;
      const waits = seated === x ? y : x;
      pairs.push([seated, leftover]);
      leftover = waits;
    } else {
      stuck = [x, y];
    }
  }

  if (
    trio &&
    isExactRematchIn(
      lp,
      trio.map((s) => s.id)
    )
  ) {
    const donor = pairs.pop();
    if (donor) {
      // Swapping any one member breaks the trio's exactness, and the traded
      // member's two-person memory can't exactly match a pair.
      const [p, q] = donor;
      const traded = trio.pop()!;
      trio.push(p);
      pairs.push([q, traded]);
    } else {
      stuck = trio;
      trio = null;
    }
  }

  let next = w;
  for (const [a, b] of pairs) {
    next = createChat(next, [a.id, b.id], activity);
  }
  if (trio) {
    next = createChat(
      next,
      trio.map((s) => s.id),
      activity
    );
  }

  return {
    ...next,
    leftoverStudentId: leftover?.id ?? null,
    // Unlike the heads-up, this isn't gated on the rematchWarning setting:
    // it explains why the button visibly left students in line.
    rematchNotice:
      stuck.length > 0
        ? `${listNames(stuck.map((s) => s.realName))} just chatted ${
            stuck.length === 2 ? "with each other" : "together"
          }, so they're still in line.`
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
