import { useEffect, useRef, useState } from "react";

import {
  SKIP_AUTO_END_TO_EXPIRY_SECONDS,
  SKIP_AUTO_END_TO_FINALE_SECONDS,
} from "@/components/chat/useChatDemo";
import { characterLabel } from "@/lib/characterLabel";
import { withCurrentCharacters } from "@/lib/hostActivity";
import { nextId, randInt, randomFrom } from "@/lib/random";
import { useLatestRef } from "@/lib/useLatestRef";
import { HOST_CHATTER_LINES } from "@/mockData";
import type { HostedActivity } from "@/types/activity";
import { NOTICE_SENDER_ID } from "@/types/chat";

import {
  activeChatMembers,
  createChat,
  endChatIn,
  JOIN_GAP_MAX_SECONDS,
  JOIN_GAP_MIN_SECONDS,
  pairEveryoneIn,
  RETURN_MAX_SECONDS,
  RETURN_MIN_SECONDS,
  seedWorld,
  tickWorld,
  wereLastPartnersIn,
  type HostedChat,
  type HostWorld,
  type WaitingStudent,
} from "./hostWorld";

/*
  The host page's demo "engine": with no backend, this simulates the whole
  round — students joining over time, the waiting queue, pairing (manual,
  pair-everyone, and auto-match), per-chat auto-end clocks, chats that keep
  talking, and quiet-exit removals. Everything a real backend will push
  later flows through here; the components only render its state and call
  its actions. The pure simulation rules live in hostWorld.ts (same
  directory); this hook owns the React state, the clocks, and the actions.
*/

const DRIP_INTERVAL_MS = 4200;

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
  // as useChatDemo. `commit` updates worldRef eagerly so two actions in one
  // tick can't stomp each other.
  const worldRef = useRef(world);
  const activityRef = useLatestRef(activity);
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
  }, [activityRef]);

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
      const target = randomFrom(pool);
      const members = activeChatMembers(target);
      const lastSenderId =
        target.messages[target.messages.length - 1]?.senderId;
      const speakers = members.filter((m) => m.id !== lastSenderId);
      const speaker = randomFrom(speakers.length > 0 ? speakers : members);
      const text = randomFrom(HOST_CHATTER_LINES);
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
    commit(pairEveryoneIn(worldRef.current, activityRef.current));
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
