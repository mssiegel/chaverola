import { useEffect, useRef, useState } from "react";

import {
  SKIP_AUTO_END_TO_EXPIRY_SECONDS,
  SKIP_AUTO_END_TO_FINALE_SECONDS,
} from "@/components/chat/useChatDemo";
import { characterLabel } from "@/lib/characterLabel";
import { withCurrentCharacters } from "@/lib/hostActivity";
import {
  HOST_CHATTER_LINES,
  HOST_SEED_CHATS,
  HOST_STUDENT_NAMES,
} from "@/mockData";
import type { HostedActivity } from "@/types/activity";
import type {
  ChatEndReason,
  ChatMessage,
  ChatStatus,
  Participant,
} from "@/types/chat";

/*
  The host page's demo "engine": with no backend, this simulates the whole
  round — students joining over time, the waiting queue, pairing (manual,
  pair-everyone, and auto-match), per-chat auto-end clocks, chats that keep
  talking, and quiet-exit removals. Everything a real backend will push
  later flows through here; the components only render its state and call
  its actions. Chats come out shaped like the shared teacher-side contract
  (participants + messages + status, as on ChatCard), with the same per-chat
  clock ChatRoomState carries on the student side.
*/

/** Sender id for conversation notices nobody actually "sent". */
const NOTICE_SENDER_ID = "system";

/** How long a new joiner takes to show up after the previous one. */
const JOIN_GAP_MIN_SECONDS = 7;
const JOIN_GAP_MAX_SECONDS = 15;

/** How long a fake student lingers on the ended screen before returning. */
const RETURN_MIN_SECONDS = 4;
const RETURN_MAX_SECONDS = 10;

/** Breather between simulated auto-matches so pairs land one at a time. */
const AUTO_MATCH_GAP_SECONDS = 3;

const DRIP_INTERVAL_MS = 4200;

let idSeq = 0;
function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Both indexes are within bounds by construction.
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export interface WaitingStudent {
  id: string;
  realName: string;
  /** Seconds since they entered (or came back to) the queue. */
  waitSeconds: number;
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
}

interface RosterStudent {
  id: string;
  realName: string;
}

interface HostWorld {
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

function createChat(
  w: HostWorld,
  studentIds: string[],
  activity: HostedActivity
): HostWorld {
  const members = w.queue.filter((s) => studentIds.includes(s.id));
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
function endChatIn(
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

/** First queue pair that has waited long enough and isn't a fresh rematch. */
function findAutoMatchPair(
  queue: WaitingStudent[],
  thresholdSeconds: number,
  lastPartners: Record<string, string[]>
): [WaitingStudent, WaitingStudent] | null {
  const ready = queue.filter((s) => s.waitSeconds >= thresholdSeconds);
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      // Both loop indexes are within bounds.
      const a = ready[i]!;
      const b = ready[j]!;
      if (!wereLastPartnersIn(lastPartners, a.id, b.id)) return [a, b];
    }
  }
  return null;
}

/** One second of simulated classroom. */
function tickWorld(w: HostWorld, activity: HostedActivity): HostWorld {
  const settings = activity.settings;
  let queue = w.queue.map((s) => ({ ...s, waitSeconds: s.waitSeconds + 1 }));

  // Per-chat auto-end clocks. At zero the chat ends with reason "timer" —
  // students get the ⏰ "Time's up!" copy, never the generic one.
  const expiring: HostedChat[] = [];
  const chats = w.chats.map((chat) => {
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
    queue = [...queue, ...returning.map((s) => ({ ...s, waitSeconds: 0 }))];
  }

  // New students joining over time — they append at the bottom.
  let joinPool = w.joinPool;
  let secondsUntilNextJoin = w.secondsUntilNextJoin;
  if (joinPool.length > 0) {
    secondsUntilNextJoin -= 1;
    if (secondsUntilNextJoin <= 0) {
      const [joiner, ...rest] = joinPool;
      queue = [...queue, { ...joiner!, waitSeconds: 0 }];
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
    secondsUntilAutoMatch: Math.max(0, w.secondsUntilAutoMatch - 1),
  };

  for (const chat of expiring) {
    next = endChatIn(next, chat.id, "timer");
  }

  // Setting #4: waiting students past the threshold pair up on their own,
  // 1:1, skipping fresh rematches. One pair at a time so the rail reads.
  if (settings.autoMatch && next.secondsUntilAutoMatch === 0) {
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
function seedWorld(activity: HostedActivity): HostWorld {
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
      students.forEach((s) => queue.push({ ...s, waitSeconds: 0 }));
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
  };
}

export interface HostActivityDemo {
  waiting: WaitingStudent[];
  chatsInProgress: HostedChat[];
  completedChats: HostedChat[];
  studentsChattingCount: number;
  /** Character ids used by a live chat right now — their rows can't be removed. */
  characterIdsInUse: ReadonlySet<string>;
  leftoverStudentId: string | null;
  rematchNotice: string | null;
  dismissRematchNotice: () => void;
  wereLastPartners: (aId: string, bId: string) => boolean;
  startChat: (studentIds: string[]) => void;
  pairEveryone: () => void;
  endChat: (chatId: string) => void;
  endAllChats: () => void;
  removeFromQueue: (studentId: string) => void;
  removeFromChat: (chatId: string, studentId: string) => void;
  /** Dev-only trigger: a student joins right now. */
  triggerJoin: () => void;
  canTriggerJoin: boolean;
  /** Dev-only trigger: fast-forward every live clock (finale, then expiry). */
  fastForwardClocks: () => void;
}

export function useHostActivityDemo(
  activity: HostedActivity
): HostActivityDemo {
  const [world, setWorld] = useState<HostWorld>(() => seedWorld(activity));

  // Refs so timers and actions always read the freshest state — same idiom
  // as useChatDemo. `commit` updates the ref eagerly so two actions in one
  // tick can't stomp each other.
  const worldRef = useRef(world);
  const activityRef = useRef(activity);
  useEffect(() => {
    activityRef.current = activity;
  });
  const commit = (next: HostWorld) => {
    worldRef.current = next;
    setWorld(next);
  };

  // The master 1-second tick: wait times, clocks, returns, joins, auto-match.
  useEffect(() => {
    const interval = setInterval(() => {
      commit(tickWorld(worldRef.current, activityRef.current));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // The chatter drip keeps live chats moving. Fresh chats speak first so a
  // new pairing never sits silent while an older chat hogs the dice.
  useEffect(() => {
    const interval = setInterval(() => {
      const w = worldRef.current;
      const live = w.chats.filter(
        (c) => c.status === "active" && activeChatMembers(c).length >= 2
      );
      if (live.length === 0) return;
      const fresh = live.filter((c) => c.messages.length < 2);
      const pool = fresh.length > 0 ? fresh : live;
      const target = pool[randInt(0, pool.length - 1)]!;
      const members = activeChatMembers(target);
      const lastSenderId =
        target.messages[target.messages.length - 1]?.senderId;
      const speakers = members.filter((m) => m.id !== lastSenderId);
      const speaker = (speakers.length > 0 ? speakers : members)[
        randInt(0, (speakers.length > 0 ? speakers : members).length - 1)
      ]!;
      const text =
        HOST_CHATTER_LINES[randInt(0, HOST_CHATTER_LINES.length - 1)]!;
      commit({
        ...w,
        chats: w.chats.map((c) =>
          c.id === target.id
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { id: nextId("m"), senderId: speaker.id, text },
                ],
              }
            : c
        ),
      });
    }, DRIP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Flipping the auto-end toggle applies to RUNNING chats immediately — off
  // clears their clocks, on starts them fresh. Changing only the minutes
  // deliberately does nothing here: running chats keep the clock they
  // started with; the new duration reaches chats started afterward. See
  // DECISIONS.md.
  const prevAutoEndOn = useRef(activity.settings.autoEndChats);
  useEffect(() => {
    const wasOn = prevAutoEndOn.current;
    const isOn = activity.settings.autoEndChats;
    prevAutoEndOn.current = isOn;
    if (wasOn === isOn) return;
    const w = worldRef.current;
    commit({
      ...w,
      chats: w.chats.map((c) =>
        c.status === "active"
          ? {
              ...c,
              autoEndSecondsLeft: isOn
                ? activity.settings.autoEndMinutes * 60
                : null,
            }
          : c
      ),
    });
    // The minutes are deliberately NOT a dependency: a minutes-only change
    // must never touch running chats (see the comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.settings.autoEndChats]);

  const startChat = (studentIds: string[]) => {
    commit({
      ...createChat(worldRef.current, studentIds, activityRef.current),
      rematchNotice: null,
    });
  };

  const pairEveryone = () => {
    const w = worldRef.current;
    const activity = activityRef.current;
    if (w.queue.length < 2) return;

    const pool = [...w.queue];
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

    // Greedy in queue order, preferring anyone who isn't a fresh rematch;
    // only when nobody fresh is left does a pair repeat — and that pair
    // gets called out instead of silently rematched.
    const pairs: { a: WaitingStudent; b: WaitingStudent; forced: boolean }[] =
      [];
    while (pool.length >= 2) {
      const a = pool.shift()!;
      let index = pool.findIndex(
        (b) => !wereLastPartnersIn(w.lastPartners, a.id, b.id)
      );
      const forced = index === -1;
      if (forced) index = 0;
      const b = pool.splice(index, 1)[0]!;
      pairs.push({ a, b, forced });
    }

    let next = w;
    const forcedPairs: string[] = [];
    for (const { a, b, forced } of pairs) {
      next = createChat(next, [a.id, b.id], activity);
      if (forced) forcedPairs.push(`${a.realName} and ${b.realName}`);
    }
    if (trio) {
      const trioHasRematch = trio.some((a, i) =>
        trio
          .slice(i + 1)
          .some((b) => wereLastPartnersIn(w.lastPartners, a.id, b.id))
      );
      next = createChat(
        next,
        trio.map((s) => s.id),
        activity
      );
      if (trioHasRematch) {
        forcedPairs.push(
          `the group of ${trio.map((s) => s.realName.split(" ")[0]).join(", ")}`
        );
      }
    }

    commit({
      ...next,
      leftoverStudentId: leftover?.id ?? null,
      rematchNotice:
        activity.settings.rematchWarning && forcedPairs.length > 0
          ? `${forcedPairs.join(", and ")} just chatted together, but there was no other way to pair everyone.`
          : null,
    });
  };

  const endChat = (chatId: string) => {
    commit(endChatIn(worldRef.current, chatId, "teacher"));
  };

  const endAllChats = () => {
    let w = worldRef.current;
    for (const chat of w.chats.filter((c) => c.status === "active")) {
      w = endChatIn(w, chat.id, "teacher");
    }
    commit(w);
  };

  const removeFromQueue = (studentId: string) => {
    const w = worldRef.current;
    commit({
      ...w,
      queue: w.queue.filter((s) => s.id !== studentId),
      leftoverStudentId:
        w.leftoverStudentId === studentId ? null : w.leftoverStudentId,
    });
  };

  // Quiet exit: never announced to students as a removal, so classmates
  // can't tell it from a dropped connection. In a group the room continues
  // with a neutral "left the chat" notice; in a 1:1 the peer's chat simply
  // ends with the teacher copy. The removed student lands on the name step
  // signed out (student side) — here they just leave the simulation.
  const removeFromChat = (chatId: string, studentId: string) => {
    const w = worldRef.current;
    const activity = activityRef.current;
    const chat = w.chats.find((c) => c.id === chatId);
    if (!chat || chat.status !== "active") return;
    const remaining = activeChatMembers(chat).filter((p) => p.id !== studentId);

    if (remaining.length < 2) {
      const ended: HostedChat = {
        ...chat,
        status: "ended",
        endReason: "teacher",
        autoEndSecondsLeft: null,
        inactiveStudentIds: [...chat.inactiveStudentIds, studentId],
      };
      commit({
        ...w,
        chats: w.chats.map((c) => (c.id === chatId ? ended : c)),
        wrappingUp: [
          ...w.wrappingUp,
          ...remaining.map((p) => ({
            student: { id: p.id, realName: p.realName },
            secondsUntilReturn: randInt(RETURN_MIN_SECONDS, RETURN_MAX_SECONDS),
          })),
        ],
      });
      return;
    }

    const removed = chat.participants.find((p) => p.id === studentId);
    const label = removed
      ? characterLabel(withCurrentCharacters([removed], activity)[0]!)
      : "Someone";
    commit({
      ...w,
      chats: w.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              inactiveStudentIds: [...c.inactiveStudentIds, studentId],
              messages: [
                ...c.messages,
                {
                  id: nextId("m"),
                  senderId: NOTICE_SENDER_ID,
                  kind: "notice" as const,
                  text: `${label} left the chat`,
                },
              ],
            }
          : c
      ),
    });
  };

  const triggerJoin = () => {
    const w = worldRef.current;
    const [joiner, ...rest] = w.joinPool;
    if (!joiner) return;
    commit({
      ...w,
      queue: [...w.queue, { ...joiner, waitSeconds: 0 }],
      joinPool: rest,
      secondsUntilNextJoin: randInt(JOIN_GAP_MIN_SECONDS, JOIN_GAP_MAX_SECONDS),
    });
  };

  const fastForwardClocks = () => {
    const w = worldRef.current;
    const clocks = w.chats
      .filter((c) => c.status === "active" && c.autoEndSecondsLeft !== null)
      .map((c) => c.autoEndSecondsLeft!);
    if (clocks.length === 0) return;
    // Staged like the student demo's skip: first to the finale, then expiry.
    const target = clocks.some((s) => s > SKIP_AUTO_END_TO_FINALE_SECONDS)
      ? SKIP_AUTO_END_TO_FINALE_SECONDS
      : SKIP_AUTO_END_TO_EXPIRY_SECONDS;
    commit({
      ...w,
      chats: w.chats.map((c) =>
        c.status === "active" && c.autoEndSecondsLeft !== null
          ? { ...c, autoEndSecondsLeft: Math.min(c.autoEndSecondsLeft, target) }
          : c
      ),
    });
  };

  const chatsInProgress = world.chats.filter((c) => c.status === "active");
  const completedChats = world.chats.filter((c) => c.status === "ended");
  const characterIdsInUse = new Set(
    chatsInProgress.flatMap((c) =>
      activeChatMembers(c).map((p) => p.character.id)
    )
  );

  return {
    waiting: world.queue,
    chatsInProgress,
    completedChats,
    studentsChattingCount: chatsInProgress.reduce(
      (sum, c) => sum + activeChatMembers(c).length,
      0
    ),
    characterIdsInUse,
    leftoverStudentId: world.leftoverStudentId,
    rematchNotice: world.rematchNotice,
    dismissRematchNotice: () =>
      commit({ ...worldRef.current, rematchNotice: null }),
    wereLastPartners: (aId, bId) =>
      wereLastPartnersIn(world.lastPartners, aId, bId),
    startChat,
    pairEveryone,
    endChat,
    endAllChats,
    removeFromQueue,
    removeFromChat,
    triggerJoin,
    canTriggerJoin: world.joinPool.length > 0,
    fastForwardClocks,
  };
}
