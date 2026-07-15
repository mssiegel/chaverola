import { DEFAULT_ACTIVITY_SETTINGS } from "@/lib/activitySetup";
import type { HostedActivity } from "@/types/activity";
import type { ChatEndReason, ChatStatus } from "@/types/chat";

import { demoActivity } from "./activityDemo";

/*
  Mock data behind the teacher's live activity page. The host demo runs the
  SAME activity as the student join flow (code `1234`, Ms. Cohen, the Rome
  scenario) — there is no cross-tab sync, the two sides just agree on the
  story. The dialogue here is deliberately character-agnostic: chats on the
  host page get characters assigned at pairing time (possibly a teacher's own
  cast), so no line may name a specific character.
*/

/**
 * The Rome demo activity as a HostedActivity — the fallback seed for direct
 * visits to `/activity/host/1234`. Deliberately has NO teacher email, so
 * direct visits exercise the settings section's add-your-email nudge.
 * Returns a fresh object each call: the live page mutates its settings.
 */
export function demoHostedActivity(): HostedActivity {
  return {
    ...demoActivity,
    characters: demoActivity.characters.map((c) => ({ ...c })),
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  };
}

/**
 * The demo class, in the order the simulation uses them: the first 5 seed the
 * two in-progress chats, the next 6 sit in the waiting queue (they're the
 * students of the two completed chats, so the rematch warning is demoable
 * right away), and the rest trickle in over time as new joiners.
 */
export const HOST_STUDENT_NAMES: readonly string[] = [
  "Daniel Katz",
  "Ella Peretz",
  "Maya Chen",
  "Leo Rivera",
  "Noa Shapiro",
  "Omar Haddad",
  "Grace Kim",
  "Liam O'Connor",
  "Tamar Golan",
  "Sofia Alvarez",
  "Emma Davis",
  "Yoni Adler",
  "Priya Patel",
  "Avi Rosen",
  "Mia Levi",
  "Noah Park",
  "Dana Klein",
  "Sam Barak",
];

/** One pre-scripted chat for the host page's seed round. */
export interface HostSeedChat {
  /** How many students it seats (2–4). */
  size: 2 | 3 | 4;
  status: ChatStatus;
  /** Why it ended, for ended seeds; null while active. */
  endReason: ChatEndReason | null;
  /** Lines in order; `seat` indexes into the chat's participants. */
  lines: { seat: number; text: string }[];
}

/**
 * The seed chats: two in progress (a 1:1 and a group of 3, so the group
 * paths are exercised) and two completed (a 1:1 and a group of 4 — the
 * four-seat chat puts the whole Rome cast on a card, emoji-less Marc Antony
 * included, so name-only labels stay visibly exercised).
 */
export const HOST_SEED_CHATS: readonly HostSeedChat[] = [
  {
    size: 2,
    status: "active",
    endReason: null,
    lines: [
      { seat: 0, text: "ok be honest. was it you" },
      { seat: 1, text: "was WHAT me" },
      { seat: 0, text: "you know exactly what" },
      { seat: 1, text: "I was nowhere near it. ask literally anyone" },
      { seat: 0, text: "everyone says they saw you there 👀" },
      { seat: 1, text: "then everyone needs their eyes checked" },
    ],
  },
  {
    size: 3,
    status: "active",
    endReason: null,
    lines: [
      { seat: 0, text: "I call this meeting to order" },
      { seat: 1, text: "you can't just CALL meetings" },
      { seat: 2, text: "too late, we're all here" },
      { seat: 0, text: "first item: someone's been spreading rumors" },
      { seat: 1, text: "wasn't me" },
      { seat: 2, text: "wasn't me either. weird how fast you answered though" },
      { seat: 1, text: "WEIRD?? I'll remember this" },
    ],
  },
  {
    size: 2,
    status: "ended",
    endReason: "student",
    lines: [
      { seat: 0, text: "so are we allies or not" },
      { seat: 1, text: "depends what I get out of it" },
      { seat: 0, text: "half of everything and my eternal respect" },
      { seat: 1, text: "make it all of everything and we have a deal" },
      { seat: 0, text: "…fine. but I keep the title" },
      { seat: 1, text: "deal 🤝" },
      { seat: 0, text: "history will say this was my idea btw" },
    ],
  },
  {
    size: 4,
    status: "ended",
    endReason: "timer",
    lines: [
      { seat: 0, text: "everyone remember the plan?" },
      { seat: 1, text: "there was a plan??" },
      { seat: 2, text: "I remember MY plan" },
      { seat: 3, text: "we agreed on nothing. that was the plan" },
      { seat: 0, text: "this is why nothing ever gets done around here" },
      { seat: 1, text: "ok new plan. we all act natural" },
      { seat: 2, text: "you've never acted natural in your life" },
      { seat: 3, text: "agreed. motion carried ✋" },
    ],
  },
];

/**
 * Ambient lines the simulation drips into live chats so the page keeps
 * moving. Any speaker can say any of these.
 */
export const HOST_CHATTER_LINES: readonly string[] = [
  "wait wait wait. say that again",
  "you can't PROVE anything",
  "ok that's actually genius",
  "I have a plan. it's only slightly terrible",
  "absolutely not. I'm listening though",
  "shhh someone's listening",
  "the history books will side with me",
  "that's your worst idea yet. I love it",
  "meet me at the usual spot after this",
  "I heard a rumor about you btw 👀",
  "source? I made it up",
  "we stick to the story, agreed?",
  "you've changed 😔",
  "plot twist: I knew the whole time",
  "let's vote on it. I vote me",
  "deal. but you owe me",
  "I want that in writing",
  "take that back RIGHT now 😤",
];
