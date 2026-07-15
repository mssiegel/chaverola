import type { ActivitySettings, HostedActivity } from "@/types/activity";
import type { Character } from "@/types/chat";

import {
  hasString,
  isRecord,
  readSessionJson,
  writeSessionJson,
} from "./storage";
import { clampChars, clampWords } from "./text";

/*
  Everything behind the teacher's setup form that isn't UI: the field caps,
  the in-progress draft (sessionStorage — survives a refresh on a flaky
  classroom device, gone when the tab closes), validation for the
  always-tappable Host button, and the hand-off of the finished activity to
  the live host page. See DECISIONS.md → "Teacher activity setup".
*/

export const MIN_CHARACTERS = 2;
export const MAX_CHARACTERS = 4;

/** Character names and the hosted-by name — both render in tight chrome. */
export const NAME_MAX_CHARS = 30;
/** The caps' quiet counters appear only this close to the limit. */
export const NAME_COUNTER_FROM = 25;

export const SCENE_MAX_WORDS = 20;
export const SCENE_COUNTER_FROM = 16;

export interface StepperBounds {
  min: number;
  max: number;
  step: number;
  default: number;
}

export const AUTO_END_MINUTES: StepperBounds = {
  min: 1,
  max: 30,
  step: 1,
  default: 7,
};

export const AUTO_MATCH_SECONDS: StepperBounds = {
  min: 5,
  max: 120,
  step: 5,
  default: 20,
};

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  revealNames: true,
  autoEndChats: true,
  autoEndMinutes: AUTO_END_MINUTES.default,
  rematchWarning: true,
  autoMatch: true,
  autoMatchSeconds: AUTO_MATCH_SECONDS.default,
};

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/** Slug a character name into an id, unique within this activity. */
function toCharacterId(name: string, taken: Set<string>): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "character";
  let id = slug;
  let suffix = 2;
  while (taken.has(id)) id = `${slug}-${suffix++}`;
  taken.add(id);
  return id;
}

/**
 * Turn a valid draft into the activity the teacher is about to host. Rows
 * left empty are dropped here — an abandoned character row never blocks a
 * class from starting.
 */
export function buildHostedActivity(
  draft: ActivityDraft,
  joinCode: string
): HostedActivity {
  const taken = new Set<string>();
  const characters: Character[] = draft.characters
    .filter(isFilledCharacter)
    .map((row) => {
      const name = row.name.trim();
      const character: Character = { id: toCharacterId(name, taken), name };
      if (row.emoji) character.emoji = row.emoji;
      return character;
    });

  const scene = draft.scene.trim();
  const email = draft.teacherEmail.trim();
  const activity: HostedActivity = {
    joinCode,
    hostName: draft.hostName.trim(),
    characters,
    settings: { ...draft.settings },
  };
  if (scene !== "") activity.scenario = scene;
  if (email !== "") activity.teacherEmail = email;
  return activity;
}

// ---------------------------------------------------------------------------
// Hand-off to the live host page

const HOSTED_ACTIVITY_KEY = "chaverola.hostedActivity";

/**
 * Stashes the activity the teacher just hosted so `/activity/host/:joinCode`
 * can pick it up (same per-tab spirit as the draft and the student session).
 * The host page falls back to the Rome demo activity for direct visits.
 */
export function saveHostedActivity(activity: HostedActivity): void {
  writeSessionJson(HOSTED_ACTIVITY_KEY, activity);
}

export function readHostedActivity(
  joinCode: string
): HostedActivity | undefined {
  const stashed = readSessionJson(
    HOSTED_ACTIVITY_KEY,
    (parsed): HostedActivity | null => {
      // A stash that fails any of this reads as absent, and the host page
      // falls back to its demo-activity redirect instead of crashing the
      // engine on a half-formed activity.
      if (
        isRecord(parsed) &&
        parsed.joinCode === joinCode &&
        hasString(parsed, "hostName") &&
        Array.isArray(parsed.characters) &&
        parsed.characters.every(
          (c: unknown) =>
            isRecord(c) && hasString(c, "id") && hasString(c, "name")
        ) &&
        isRecord(parsed.settings)
      ) {
        return parsed as unknown as HostedActivity;
      }
      return null;
    }
  );
  return stashed ?? undefined;
}
