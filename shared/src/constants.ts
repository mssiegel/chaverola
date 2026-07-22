import type { ActivitySettings } from "./types";

/*
  Limits and defaults shared by the client's setup form and the server's
  validation — one source of truth so the form can't accept what the server
  rejects. UI-only knobs (when counters appear, etc.) stay in the client.
*/

export const MIN_CHARACTERS = 2;
export const MAX_CHARACTERS = 4;

/** Character names and the hosted-by name — both render in tight chrome. */
export const NAME_MAX_CHARS = 30;

/** A student's own name at the join gate — the form and the socket layer's
 *  fresh-join validation read the same cap. */
export const STUDENT_NAME_MAX_CHARS = 40;

export const SCENE_MAX_WORDS = 20;
/** Hard byte-ish backstop for the scene (the word cap is the real limit). */
export const SCENE_MAX_CHARS = 500;

/** One chat message, counted in code points (a multi-unit emoji is one) —
 *  the composer and the server's `chat:send` guard read the same cap, so
 *  the composer can't accept what the server rejects. */
export const CHAT_MESSAGE_MAX_CHARS = 75;

/** Per-chat transcript cap: oldest lines drop past this. A class period is
 *  ~10 minutes of chat — nobody is building a message archive here. */
export const CHAT_TRANSCRIPT_MAX_LINES = 200;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** RFC 5321's practical ceiling for a whole address. */
export const EMAIL_MAX_CHARS = 254;

export interface StepperBounds {
  min: number;
  max: number;
  step: number;
  default: number;
}

export const AUTO_MATCH_SECONDS: StepperBounds = {
  min: 5,
  max: 120,
  step: 5,
  default: 20,
};

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  revealNames: true,
  rematchWarning: true,
  autoMatch: true,
  autoMatchSeconds: AUTO_MATCH_SECONDS.default,
};

/**
 * The demo activity's join code — always works, fully client-simulated, and
 * the server never issues it (nor answers for it: `GET /activities/1234` is
 * a 404 by design).
 */
export const DEMO_JOIN_CODE = "1234";

/** Shape of a student join code. Anything else 404s without a lookup. */
export const JOIN_CODE_PATTERN = /^\d{4}$/;
/**
 * Shape of a host key (base64url; real keys are 24 chars — the range leaves
 * room to lengthen them without touching the client). A 4-digit join code
 * structurally can't match, so it can never unlock the host route.
 */
export const HOST_KEY_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
