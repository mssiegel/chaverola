import type { ChatMessage, Participant } from "@/types/chat";
import type { ActivityChatScenarioKey } from "@/mockData";

export type StudentStage =
  | "code"
  | "loading"
  | "name"
  | "lobby"
  | "chatting"
  | "ended"
  // The activity died under a seated student (deploy/restart wipe, TTL) —
  // distinct from "ended", which is a finished chat.
  | "activity-gone";

/** What went wrong with the last code the student tried. */
export type CodeProblem = "not-found" | "unreachable";

/** One mock match the lobby's demo trigger fired the student into. */
export interface DemoMatch {
  kind: "demo";
  /** Bumped per match so ChatStage remounts with a fresh chat every time. */
  seq: number;
  scenarioKey: ActivityChatScenarioKey;
}

/**
 * A real chat the server matched the student into (chat:started). Assembled
 * from the wire's characterIds against the fetched roster; peers carry no
 * real names by construction — the student wire never has them.
 */
export interface LiveMatch {
  kind: "live";
  chatId: string;
  /** The student's own seat (realName from the session). */
  self: Participant;
  /** Peers still in the room; chat:update shrinks this. */
  peers: Participant[];
  /** Everyone ever in the room — keeps colors and lines stable. Built from
   *  the wire's everPeers, never aliased to peers: a departed member has to
   *  keep resolving or their backlog lines silently vanish. */
  everPeers: Participant[];
  /** The transcript: real lines (from chat:line and chat:started's backlog)
   *  interleaved with local membership notices ("X left the chat"). */
  messages: ChatMessage[];
  /** The one typing slot (a characterId), last writer wins. On the match
   *  state, not beside it, so every clearing invariant lives in the merge
   *  points that already exist. Expired by a TTL timer from the last
   *  heartbeat; a peer's landing message clears their own slot instantly. */
  typingPeerId: string | null;
  /** Peers currently dropped, characterId → the epoch-ms deadline of their
   *  reconnect window. Fed live by chat:peer-connection and rebuilt
   *  wholesale from chat:started's reconnectingPeers backlog on every
   *  delivery (the authoritative copy — this client's own blip may have
   *  swallowed a drop or a return). Deadlines, not counters: the stage
   *  re-derives seconds from real time, so background-tab throttling
   *  self-corrects. On the match state for the same reason as typingPeerId
   *  — shrinkToPeers strips leavers structurally. */
  offlinePeers: Record<string, number>;
  /** The peer whose "X is back! 🎉" flash is showing (a characterId), or
   *  null. Cleared by a real-time timer ~2.5s after the return. */
  returnedFlashId: string | null;
}

export type ActiveMatch = DemoMatch | LiveMatch;

/**
 * A characterId the fetched roster can't resolve (shouldn't happen — the
 * server deals from the same roster the student fetched — but the wire is
 * the wire). The room still works; only the label is a mystery.
 */
export const FALLBACK_CHARACTER_NAME = "Mystery guest";

/** How long "X is back! 🎉" shows before the banner clears (or hands back
 *  to another offline peer's countdown). Real time, never scaled — live
 *  wire timing is never compressed. */
export const RETURNED_FLASH_MS = 2500;

export const PAGE_TITLES: Record<StudentStage, string> = {
  code: "Join an Activity",
  loading: "Join an Activity",
  name: "Join an Activity",
  lobby: "Waiting Lobby",
  chatting: "Chatting",
  ended: "Chat Ended",
  "activity-gone": "Activity Ended",
};

/**
 * How long the demo lobby waits before the pretend teacher pairs the student
 * anyway, so a visitor who never touches the demo buttons still reaches a
 * chat. ~20s (founder-picked): enough time to take the lobby in first.
 * See DECISIONS.md → "The demo lobby pairs you by itself after 20 seconds".
 */
export const DEMO_LOBBY_AUTO_MATCH_MS = 20_000;

/** How long the demo's pretend wifi blip keeps the reconnecting pill up —
 *  demo simulation, so it runs through scaledMs (live socket state never
 *  does). */
export const DEMO_WIFI_BLIP_MS = 4_000;

/**
 * The copy for a lookup that has blown past the slow-hint mark
 * (SLOW_LOOKUP_HINT_MS). Shared by the code-entry button's pending state
 * and the loading stage.
 */
export const SLOW_LOOKUP_COPY =
  "Chaverola is just waking up. The first join of the day takes about half a minute.";

/** The copy for a server we couldn't reach at all — distinct from not-found. */
export const UNREACHABLE_COPY =
  "We can't reach Chaverola right now. Check your internet, then try again.";

/** The floating white card the student world's stages render on. */
export const STUDENT_CARD_CLASS =
  "rounded-3xl bg-card shadow-2xl shadow-brand-grape-strong/30";
