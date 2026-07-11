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
  /** True for the local student ("you"). */
  isSelf?: boolean;
}

export interface ChatMessage {
  id: string;
  /** Participant id of the sender. */
  senderId: string;
  text: string;
}

/**
 * Peer link state, driven by mock events in the demo.
 * `reconnected` is a brief success flash before returning to `connected`.
 */
export type PeerConnectionState =
  "connected" | "disconnected" | "reconnecting" | "reconnected";

export interface ScriptedLine {
  senderId: string;
  text: string;
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
  seedMessages: Array<{ senderId: string; text: string }>;
  /** Timed lines the peer(s) send after opening. */
  script: ScriptedLine[];
  /** Random peer chatter after the script runs out. */
  ambientLines: string[];
  /** Random peer responses to a message the student sends. */
  replyLines: string[];
}
