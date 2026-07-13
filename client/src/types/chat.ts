/*
  Shared chat domain types. Used by the Student chatbox now, and by the Teacher
  chatbox later — both follow the same chatbox conventions.
*/

export interface Character {
  id: string;
  /** Display name, e.g. "Caesar's ghost". */
  name: string;
  /** A single emoji shown with the name, e.g. "👻". */
  emoji: string;
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

export interface ChatMessage {
  id: string;
  /** Participant id of the sender. */
  senderId: string;
  text: string;
}

/** Whether a chat is still going or has been ended. */
export type ChatStatus = "active" | "ended";

/** A chat message before a demo engine stamps an id on it. */
export type SeedMessage = Omit<ChatMessage, "id">;

/**
 * Peer link state, driven by mock events in the demo.
 * `reconnected` is a brief success flash before returning to `connected`.
 */
export type PeerConnectionState =
  "connected" | "disconnected" | "reconnecting" | "reconnected";

/**
 * One chat as the teacher sees it while monitoring an activity: who's in it,
 * everything said so far, and whether it's still going.
 */
export interface MonitoredChat {
  id: string;
  participants: Participant[];
  messages: ChatMessage[];
  status: ChatStatus;
}

export interface ScriptedLine extends SeedMessage {
  /** Delay (ms) after the previous scripted line before this one plays. */
  delayMs: number;
}

/**
 * A backend-free scenario for the teacher demo: one monitored chat plus the
 * lines the demo engine drips into it while it stays active.
 */
export interface TeacherChatScenario {
  id: string;
  participants: Participant[];
  status: ChatStatus;
  /** Messages already present when the page opens. */
  seedMessages: SeedMessage[];
  /** Lines dripped into the chat over time, in order (looping). */
  upcomingLines: SeedMessage[];
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
