/*
  Shared chat domain types. Used by the student chatbox and the teacher's chat
  cards — both follow the same chatbox conventions.
*/

export interface Character {
  id: string;
  /** Display name, e.g. "Caesar's ghost". */
  name: string;
  /**
   * A single emoji shown with the name, e.g. "👻". Optional: the teacher
   * decides per character whether it gets one, and every label simply
   * drops it when absent (see lib/characterLabel).
   */
  emoji?: string;
}

export interface Participant {
  id: string;
  character: Character;
  /**
   * The student's real name. Hidden from peers during the chat; only shown once
   * the teacher reveals names (mocked in the demo).
   */
  realName: string;
}

/**
 * The reserved sender id for conversation notices nobody actually "sent"
 * (e.g. "X left the chat"). Never a participant id.
 */
export const NOTICE_SENDER_ID = "system";

export interface ChatMessage {
  id: string;
  /** Participant id of the sender (NOTICE_SENDER_ID for notices). */
  senderId: string;
  text: string;
  /**
   * "notice" renders as a centered system line in the conversation (e.g. a
   * peer got dropped after a disconnect) instead of a spoken message.
   */
  kind?: "notice";
}

/** Whether a chat is still going or has been ended. */
export type ChatStatus = "active" | "ended";

/**
 * Why a chat ended — every reason gets its own wrap-up copy on the student
 * side (the mapping lives in ChatEndedSection). "peer" means another student
 * in the room ended it, and travels with the ender's participant id so the
 * copy can name their character (never their real name — the mystery holds
 * until the reveal). "peer-timeout" is a partner who never came back from a
 * disconnect; "self-timeout" is the student's own missed reconnect window,
 * seen when they finally get back in. "self-left" is the student walking out
 * of a group that keeps going without them — only reachable with 3+ active
 * people, since a 2-person room offers End, not Leave (see DECISIONS.md).
 */
export type ChatEndReason =
  | "student"
  | "peer"
  | "teacher"
  | "timer"
  | "peer-timeout"
  | "self-timeout"
  | "self-left";

/** A chat message before a demo engine stamps an id on it. */
export type SeedMessage = Omit<ChatMessage, "id">;

/**
 * Peer link state, driven by mock events in the demo.
 * `reconnected` is a brief success flash before returning to `connected`.
 */
export type PeerConnectionState =
  "connected" | "disconnected" | "reconnecting" | "reconnected";

/**
 * Everything a chat view needs to render a live room. This is the contract
 * between a chat engine and the UI: the demo engine (useChatDemo) returns it
 * today, and the real data source must satisfy it when it arrives — the
 * views never depend on anything engine-specific.
 */
export interface ChatRoomState {
  self: Participant;
  /** Peers still in the room (a group may have dropped someone). */
  peers: Participant[];
  /** Everyone who was ever in the room — lines and colors outlive a drop. */
  participants: Participant[];
  messages: ChatMessage[];
  typingPeerId: string | null;
  peerState: PeerConnectionState;
  offlinePeerId: string | null;
  /** Seconds left in the offline peer's reconnect window (null: no window). */
  reconnectSecondsLeft: number | null;
  /**
   * Seconds left on this chat's auto-end clock (null: auto-end is off). The
   * clock is per chat — it starts when the chat starts — and the engine ends
   * the chat with reason "timer" when it hits zero.
   */
  autoEndSecondsLeft: number | null;
  isEnded: boolean;
  /** Why the chat ended; drives the wrap-up copy. Null while it's going. */
  endReason: ChatEndReason | null;
  /** Which peer ended it, when endReason is "peer". */
  endedByPeerId: string | null;
}

/** What a participant can do to a live room. */
export interface ChatRoomActions {
  send: (text: string) => void;
  endChat: (reason: ChatEndReason) => void;
  /**
   * Leave a group that keeps going without you (3+ active people). A separate
   * action from endChat because a real backend treats them differently: leave
   * removes one participant, end closes the room for everyone.
   */
  leaveChat: () => void;
}

export interface ScriptedLine extends SeedMessage {
  /** Delay (ms) after the previous scripted line before this one plays. */
  delayMs: number;
}

/**
 * A self-contained, backend-free chat scenario the demo engine can play:
 * who's in the room, what's already been said, what the peer will say next,
 * and pools of lines to keep the room feeling alive.
 */
export interface ChatScenario {
  id: string;
  self: Participant;
  peers: Participant[];
  /** Messages already present when the chat opens. */
  seedMessages: SeedMessage[];
  /** Timed lines the peer(s) send after opening. */
  script: ScriptedLine[];
  /** Random peer chatter after the script runs out. */
  ambientLines: string[];
  /** Random peer responses to a message the student sends. */
  replyLines: string[];
}
