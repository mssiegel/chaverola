import {
  AUTO_END_MINUTES,
  AUTO_MATCH_SECONDS,
  DEFAULT_ACTIVITY_SETTINGS,
  EMAIL_PATTERN,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_MAX_CHARS,
  SCENE_MAX_WORDS,
} from "@chaverola/shared";
import type {
  CharacterInput,
  CreateActivityRequest,
  StepperBounds,
} from "@chaverola/shared";
import type { ActivitySettings } from "@/types/activity";
import type { Character } from "@/types/chat";

import { readSessionJson, writeSessionJson } from "./storage";
import { clampChars, clampWords } from "./text";

/*
  Everything behind the teacher's setup form that isn't UI: the in-progress
  draft (sessionStorage — survives a refresh on a flaky classroom device,
  gone when the tab closes), validation for the always-tappable Host button,
  and the mapping of a finished draft onto the create-activity request. The
  field caps themselves live in @chaverola/shared (the server enforces the
  same numbers) and are re-exported here so form imports stay put. See
  DECISIONS.md → "Teacher activity setup".
*/

export {
  AUTO_END_MINUTES,
  AUTO_MATCH_SECONDS,
  DEFAULT_ACTIVITY_SETTINGS,
  EMAIL_PATTERN,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_MAX_CHARS,
  SCENE_MAX_WORDS,
};
export type { StepperBounds };

/** The caps' quiet counters appear only this close to the limit. */
export const NAME_COUNTER_FROM = 25;
export const SCENE_COUNTER_FROM = 16;

/** One character row as drafted — may be empty or half-filled while typing. */
export type CharacterDraft = Omit<Character, "id">;

/** The non-character fields every activity draft carries (setup and live). */
export interface ActivityDraftFields {
  hostName: string;
  teacherEmail: string;
  scene: string;
  settings: ActivitySettings;
}

/** The whole setup form, exactly as typed so far. */
export interface ActivityDraft extends ActivityDraftFields {
  characters: CharacterDraft[];
}

export function defaultActivityDraft(): ActivityDraft {
  return {
    characters: [{ name: "" }, { name: "" }],
    hostName: "",
    teacherEmail: "",
    scene: "",
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  };
}

/** A row counts once its name has any non-whitespace in it. */
export function isFilledCharacter(row: CharacterDraft): boolean {
  return row.name.trim() !== "";
}

// ---------------------------------------------------------------------------
// Draft persistence

const DRAFT_KEY = "chaverola.activityDraft";

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Keep a stepper value inside its bounds. */
export function clampToBounds(value: number, bounds: StepperBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/** Clamp to bounds and snap onto the step grid (steps count from `min`). */
function snapToBounds(value: unknown, bounds: StepperBounds): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : bounds.default;
  const stepped =
    Math.round((n - bounds.min) / bounds.step) * bounds.step + bounds.min;
  return clampToBounds(stepped, bounds);
}

/** Rebuild a trustworthy draft from whatever was in storage. */
function sanitizeDraft(raw: unknown): ActivityDraft {
  const draft = defaultActivityDraft();
  if (typeof raw !== "object" || raw === null) return draft;
  const candidate = raw as Record<string, unknown>;

  if (Array.isArray(candidate.characters)) {
    const rows = candidate.characters
      .slice(0, MAX_CHARACTERS)
      .map((row: unknown): CharacterDraft => {
        const record =
          typeof row === "object" && row !== null
            ? (row as Record<string, unknown>)
            : {};
        const name =
          typeof record.name === "string"
            ? clampChars(record.name, NAME_MAX_CHARS)
            : "";
        const emoji =
          typeof record.emoji === "string" && record.emoji !== ""
            ? record.emoji
            : undefined;
        return emoji ? { name, emoji } : { name };
      });
    while (rows.length < MIN_CHARACTERS) rows.push({ name: "" });
    draft.characters = rows;
  }

  if (typeof candidate.hostName === "string") {
    draft.hostName = clampChars(candidate.hostName, NAME_MAX_CHARS);
  }
  if (typeof candidate.teacherEmail === "string") {
    draft.teacherEmail = candidate.teacherEmail;
  }
  if (typeof candidate.scene === "string") {
    draft.scene = clampWords(candidate.scene, SCENE_MAX_WORDS);
  }

  const settings =
    typeof candidate.settings === "object" && candidate.settings !== null
      ? (candidate.settings as Record<string, unknown>)
      : {};
  draft.settings = {
    revealNames: asBoolean(settings.revealNames, true),
    autoEndChats: asBoolean(settings.autoEndChats, true),
    autoEndMinutes: snapToBounds(settings.autoEndMinutes, AUTO_END_MINUTES),
    rematchWarning: asBoolean(settings.rematchWarning, true),
    autoMatch: asBoolean(settings.autoMatch, true),
    autoMatchSeconds: snapToBounds(
      settings.autoMatchSeconds,
      AUTO_MATCH_SECONDS
    ),
  };

  return draft;
}

export function readActivityDraft(): ActivityDraft {
  // sanitizeDraft never rejects — a corrupt or missing draft reads as fresh.
  return readSessionJson(DRAFT_KEY, sanitizeDraft) ?? defaultActivityDraft();
}

export function saveActivityDraft(draft: ActivityDraft): void {
  writeSessionJson(DRAFT_KEY, draft);
}

// ---------------------------------------------------------------------------
// Validation

/** Which form field a problem highlights (`character-<row index>`). */
export type SetupField = "hostName" | "teacherEmail" | `character-${number}`;

export interface SetupProblem {
  field: SetupField;
  message: string;
}

/**
 * Everything that blocks hosting, in top-to-bottom form order — the form
 * scrolls to the first one. Field caps (name length, scene words) never show
 * up here because the inputs hard-block them while typing.
 */
export function validateActivityDraft(draft: ActivityDraft): SetupProblem[] {
  const problems: SetupProblem[] = [];

  const filledCount = draft.characters.filter(isFilledCharacter).length;
  if (filledCount < MIN_CHARACTERS) {
    const firstEmpty = draft.characters.findIndex(
      (row) => !isFilledCharacter(row)
    );
    problems.push({
      field: `character-${Math.max(firstEmpty, 0)}`,
      message: "Name at least two characters so students have parts to play.",
    });
  }

  // Duplicate names (trimmed, case-insensitive) get flagged on the later
  // row — students would see two identical labels with no way to tell the
  // characters apart.
  const seenNames = new Set<string>();
  draft.characters.forEach((row, index) => {
    if (!isFilledCharacter(row)) return;
    const key = row.name.trim().toLowerCase();
    if (seenNames.has(key)) {
      problems.push({
        field: `character-${index}`,
        message: "Two characters can't share a name. Change one of them.",
      });
    } else {
      seenNames.add(key);
    }
  });

  if (draft.hostName.trim() === "") {
    problems.push({
      field: "hostName",
      message: "Add your name so students know who's hosting.",
    });
  }

  const email = draft.teacherEmail.trim();
  if (email !== "" && !EMAIL_PATTERN.test(email)) {
    problems.push({
      field: "teacherEmail",
      message:
        "That email doesn't look right. Fix it, or clear the field if you " +
        "don't want the chats emailed.",
    });
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Hosting

/**
 * Turn a valid draft into the `POST /activities` body. Rows left empty are
 * dropped here — an abandoned character row never blocks a class from
 * starting. Blank optional fields are omitted (the wire contract never sends
 * `""` or null), the draft's `scene` becomes the wire's `scenario`, and no
 * ids go over: the server mints character ids.
 */
export function toCreateActivityRequest(
  draft: ActivityDraft
): CreateActivityRequest {
  const characters: CharacterInput[] = draft.characters
    .filter(isFilledCharacter)
    .map((row) => {
      const name = row.name.trim();
      return row.emoji ? { name, emoji: row.emoji } : { name };
    });

  const scene = draft.scene.trim();
  const email = draft.teacherEmail.trim();
  const request: CreateActivityRequest = {
    hostName: draft.hostName.trim(),
    characters,
    settings: { ...draft.settings },
  };
  if (scene !== "") request.scenario = scene;
  if (email !== "") request.teacherEmail = email;
  return request;
}
