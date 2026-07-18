import type { Activity, ActivitySettings, HostedActivity } from "./types";

/*
  The REST wire contract (base URL: VITE_API_URL). All bodies JSON. Every 2xx
  body is a named-member envelope. Optional fields are omitted when absent —
  never null, never "". The server trims all strings.
*/

/** A character as the client submits it — the server mints character ids. */
export interface CharacterInput {
  name: string;
  emoji?: string;
}

/** Body of `POST /activities`. */
export interface CreateActivityRequest {
  /** 1–30 chars after trim. */
  hostName: string;
  /** 2–4 characters; names unique (trimmed, case-insensitive). */
  characters: CharacterInput[];
  /** ≤ SCENE_MAX_WORDS words and ≤ SCENE_MAX_CHARS; omit when blank. */
  scenario?: string;
  /** EMAIL_PATTERN, ≤ EMAIL_MAX_CHARS; omit when blank. */
  teacherEmail?: string;
  /** Required in full; out-of-bounds values are rejected, not clamped. */
  settings: ActivitySettings;
}

/** `201` from `POST /activities`. The hostKey is never stored client-side. */
export interface CreateActivityResponse {
  activity: HostedActivity;
  hostKey: string;
}

/** `200` from `GET /activities/:joinCode` — the student projection. */
export interface GetActivityResponse {
  activity: Activity;
}

/** `200` from `GET /activities/host/:hostKey` — no hostKey echo. */
export interface GetHostedActivityResponse {
  activity: HostedActivity;
}

export type ApiErrorCode =
  "invalid_json" | "invalid_request" | "not_found" | "capacity" | "internal";

/** One field-level validation problem, zod-style: "characters.1.name". */
export interface ApiFieldIssue {
  path: string;
  message: string;
}

/** The error envelope every non-2xx response uses. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: ApiFieldIssue[];
  };
}
