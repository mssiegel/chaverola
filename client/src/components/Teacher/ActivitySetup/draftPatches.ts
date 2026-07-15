import type { Dispatch, SetStateAction } from "react";

import {
  MAX_CHARACTERS,
  type ActivityDraftFields,
  type CharacterDraft,
} from "@/lib/activitySetup";
import type { ActivitySettings } from "@/types/activity";

import type { CharacterRowState } from "./CharacterRowsField";

/** The draft shape both editors patch: keyed character rows + the fields. */
interface PatchableDraft extends ActivityDraftFields {
  characters: CharacterRowState[];
}

/**
 * The draft updaters the setup form and the live settings panel share —
 * same fields, same caps. Only the row-id minter differs: setup rows mint
 * throwaway React keys, live rows mint the character's permanent id.
 */
export function makeDraftPatches(
  setDraft: Dispatch<SetStateAction<PatchableDraft>>,
  mintRowId: () => string
) {
  const patch = (changes: Partial<PatchableDraft>) =>
    setDraft((prev) => ({ ...prev, ...changes }));

  const patchSettings = (changes: Partial<ActivitySettings>) =>
    setDraft((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...changes },
    }));

  const updateCharacter = (id: string, changes: Partial<CharacterDraft>) =>
    setDraft((prev) => ({
      ...prev,
      characters: prev.characters.map((row) =>
        row.id === id ? { ...row, ...changes } : row
      ),
    }));

  const addCharacter = () =>
    setDraft((prev) =>
      prev.characters.length >= MAX_CHARACTERS
        ? prev
        : {
            ...prev,
            characters: [...prev.characters, { id: mintRowId(), name: "" }],
          }
    );

  return { patch, patchSettings, updateCharacter, addCharacter };
}
