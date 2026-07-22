import { useEffect, useRef, useState } from "react";

import { isExactRematchIn } from "@chaverola/shared";

import {
  SKIP_AUTO_END_TO_EXPIRY_SECONDS,
  SKIP_AUTO_END_TO_FINALE_SECONDS,
} from "@/components/chat/useChatDemo";
import { characterLabel } from "@/lib/characterLabel";
import { scaledMs } from "@/lib/demoTime";
import { withCurrentCharacters } from "@/lib/hostActivity";
import { nextId, randInt, randomFrom } from "@/lib/random";
import { useLatestRef } from "@/lib/useLatestRef";
import { HOST_CHATTER_LINES } from "@/mockData";
import type { HostedActivity } from "@/types/activity";
import { NOTICE_SENDER_ID } from "@/types/chat";

import type { HostEngine, HostDemoTriggers } from "./hostEngine";
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
  type HostedChat,
  type HostWorld,
  type WaitingStudent,
} from "./hostWorld";

/*
  The `1234` demo's world "engine": it simulates the whole round — students
  joining over time, the waiting queue, pairing (manual, pair-everyone, and
  auto-match), per-chat auto-end clocks, chats that keep talking, wifi
  blips, and quiet-exit removals. The components only render its state and
  call its actions through the HostEngine contract (hostEngine.ts) — real
  activities plug useHostActivityLive into the same seam, so this hook now
  serves the demo classroom only. The pure simulation rules live in
  hostWorld.ts (same directory); this hook owns the React state, the
  clocks, and the actions.
*/

const DRIP_INTERVAL_MS = 4200;

/** How long the demo's wifi-blip student stays marked before recovering.
 *  Longer than the student demo's 4s blip on purpose: the teacher first has
 *  to spot which row dimmed. */
const WIFI_BLIP_MS = 6000;

export interface HostActivityDemo extends HostEngine, HostDemoTriggers {}

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
    }, scaledMs(1000));
    return () => clearInterval(interval);
  }, [activityRef]);

  // The chatter drip keeps live chats moving. Fresh chats speak first so a
  // new pairing never sits silent while an older chat hogs the dice.
  useEffect(() => {
    const interval = setInterval(() => {
      const w = worldRef.current;
      // A paused class is silent: the drip holds until the teacher resumes.
      if (w.paused) return;
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
    }, scaledMs(DRIP_INTERVAL_MS));
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
    // End-all closes the round, so it clears the pause too — the next round
    // starts unpaused. (The dashboard separately holds auto-match; that acts
    // on activity settings, a different owner than this world flag.)
    commit({ ...w, paused: false });
  };

  const pauseAllChats = () => {
    commit({ ...worldRef.current, paused: true });
  };

  const resumeAllChats = () => {
    commit({ ...worldRef.current, paused: false });
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
      queue: [
        ...w.queue,
        { ...joiner, waitSeconds: 0, connection: "connected" },
      ],
      joinPool: rest,
      secondsUntilNextJoin: randInt(JOIN_GAP_MIN_SECONDS, JOIN_GAP_MAX_SECONDS),
    });
  };

  // The wifi-blip recovery timer; one blip at a time (the button disables
  // while a student is marked), so a single handle is enough.
  const blipTimeout = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (blipTimeout.current !== null) clearTimeout(blipTimeout.current);
    };
  }, []);

  // Demo parity for the real lost-connection marking: a random waiting
  // student drops for a few seconds and recovers. While marked they are
  // unmatchable (hostWorld enforces it), exactly like a real dropped seat
  // in its grace window.
  const triggerWifiBlip = () => {
    const w = worldRef.current;
    const candidates = w.queue.filter((s) => s.connection === "connected");
    if (candidates.length === 0) return;
    const target = randomFrom(candidates);
    const withConnection = (
      queue: WaitingStudent[],
      connection: WaitingStudent["connection"]
    ) => queue.map((s) => (s.id === target.id ? { ...s, connection } : s));
    commit({ ...w, queue: withConnection(w.queue, "reconnecting") });
    blipTimeout.current = window.setTimeout(() => {
      // The student may have been removed mid-blip; the map just no-ops.
      const current = worldRef.current;
      commit({ ...current, queue: withConnection(current.queue, "connected") });
    }, scaledMs(WIFI_BLIP_MS));
  };

  // Stays enabled while paused on purpose: it only clamps numbers, and a
  // paused tick can't expire anything — the clock waits at its new value.
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
    isExactRematch: (ids) => isExactRematchIn(world.lastPartners, ids),
    startChat,
    pairEveryone,
    endChat,
    endAllChats,
    paused: world.paused,
    pauseAllChats,
    resumeAllChats,
    removeFromQueue,
    removeFromChat,
    // The demo world reads activity.settings directly — nothing to push.
    updateSettings: () => {},
    // The demo classroom is client-side — the teacher's link never drops.
    connection: "connected",
    triggerJoin,
    canTriggerJoin: world.joinPool.length > 0,
    fastForwardClocks,
    triggerWifiBlip,
    canTriggerWifiBlip:
      world.queue.some((s) => s.connection === "connected") &&
      !world.queue.some((s) => s.connection === "reconnecting"),
  };
}
