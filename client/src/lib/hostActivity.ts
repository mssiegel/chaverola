import type { ActivitySettings, HostedActivity } from "@/types/activity";
import type { Character, Participant } from "@/types/chat";

import {
  validateActivityDraft,
  type ActivityDraft,
  type SetupProblem,
} from "./activitySetup";

/*
  The host page's live-edit model. The settings panel edits a draft that
  mirrors the setup form (same fields, same caps, same validation), but with
  one extra rule: character ids are STABLE. A rename must reach every surface
  that shows the character — roster chips, in-progress chat cards, future
  pairings — and they all resolve labels by character id, so the id must
  never change once a row exists. New rows therefore mint their permanent id
  the moment they're added (ids are opaque; only setup slugs them for
  readability). See DECISIONS.md → "Teacher live activity page".
*/

/** One character row of the live panel: a draft with its permanent id. */
export interface LiveCharacterRow {
  id: string;
  name: string;
  emoji?: string;
}

/** The live panel's whole draft — possibly invalid mid-edit. */
export interface LiveActivityDraft {
  characters: LiveCharacterRow[];
  hostName: string;
  teacherEmail: string;
  scene: string;
  settings: ActivitySettings;
}

let liveCharacterSeq = 0;

/** Permanent id for a character row added while the activity runs. */
export function mintLiveCharacterId(): string {
  liveCharacterSeq += 1;
  return `live-character-${liveCharacterSeq}`;
}

export function liveDraftFromActivity(
  activity: HostedActivity
): LiveActivityDraft {
  return {
    characters: activity.characters.map((c) =>
      c.emoji
        ? { id: c.id, name: c.name, emoji: c.emoji }
        : { id: c.id, name: c.name }
    ),
    hostName: activity.hostName,
    teacherEmail: activity.teacherEmail ?? "",
    scene: activity.scenario ?? "",
    settings: { ...activity.settings },
  };
}

function toActivityDraft(draft: LiveActivityDraft): ActivityDraft {
  return {
    characters: draft.characters.map(({ name, emoji }) =>
      emoji ? { name, emoji } : { name }
    ),
    hostName: draft.hostName,
    teacherEmail: draft.teacherEmail,
    scene: draft.scene,
    settings: draft.settings,
  };
}

/**
 * Everything that blocks a live edit from propagating. The setup rules all
 * hold, plus one live-only rule: a character the class already has (any
 * committed id) can't be renamed to nothing — emptying the name would
 * silently drop the character at commit time, and removal has its own
 * guarded control. While problems exist, the last valid value stays in
 * effect; fixing the field applies it on the next debounce tick.
 */
export function validateLiveDraft(
  draft: LiveActivityDraft,
  committedCharacterIds: ReadonlySet<string>
): SetupProblem[] {
  const problems = validateActivityDraft(toActivityDraft(draft));
  draft.characters.forEach((row, index) => {
    if (row.name.trim() === "" && committedCharacterIds.has(row.id)) {
      problems.push({
        field: `character-${index}`,
        message:
          "Your class already has this character, so it needs a name. " +
          "To drop a character, use the remove button on rows 3 and 4.",
      });
    }
  });
  return problems;
}

/**
 * Re-labels stored participants with the roster's CURRENT characters, by id.
 * Chats capture their characters when they start; rendering through this
 * makes a live rename/emoji edit reach every card instantly. A character
 * that's no longer on the roster (removed after its chats ended) falls back
 * to the label it had, so completed cards never lose their names.
 */
export function withCurrentCharacters(
  participants: Participant[],
  activity: HostedActivity
): Participant[] {
  return participants.map((p) => ({
    ...p,
    character:
      activity.characters.find((c) => c.id === p.character.id) ?? p.character,
  }));
}

/**
 * Commit a valid draft: trims like hosting does, silently drops added rows
 * that were left empty, and keeps every character id exactly as drafted.
 */
export function activityFromLiveDraft(
  draft: LiveActivityDraft,
  base: HostedActivity
): HostedActivity {
  const characters: Character[] = draft.characters
    .filter((row) => row.name.trim() !== "")
    .map((row) => {
      const character: Character = { id: row.id, name: row.name.trim() };
      if (row.emoji) character.emoji = row.emoji;
      return character;
    });

  const activity: HostedActivity = {
    joinCode: base.joinCode,
    hostName: draft.hostName.trim(),
    characters,
    settings: { ...draft.settings },
  };
  const scene = draft.scene.trim();
  const email = draft.teacherEmail.trim();
  if (scene !== "") activity.scenario = scene;
  if (email !== "") activity.teacherEmail = email;
  return activity;
}
