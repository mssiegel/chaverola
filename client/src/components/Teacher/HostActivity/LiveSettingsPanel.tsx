import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import {
  CharacterRowsField,
  type CharacterRowState,
} from "@/components/Teacher/ActivitySetup/CharacterRowsField";
import {
  FieldError,
  FieldLabelRow,
  LimitCounter,
} from "@/components/Teacher/ActivitySetup/FieldFeedback";
import { SettingsSection } from "@/components/Teacher/ActivitySetup/SettingsSection";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_CHARACTERS,
  NAME_COUNTER_FROM,
  NAME_MAX_CHARS,
  SCENE_COUNTER_FROM,
  SCENE_MAX_WORDS,
  type SetupField,
} from "@/lib/activitySetup";
import {
  activityFromLiveDraft,
  liveDraftFromActivity,
  mintLiveCharacterId,
  validateLiveDraft,
  type LiveActivityDraft,
} from "@/lib/hostActivity";
import { charCount, clampChars, clampWords, countWords } from "@/lib/text";
import type { ActivitySettings, HostedActivity } from "@/types/activity";

import { CollapsibleSection } from "./CollapsibleSection";

/** How long the teacher pauses typing before an edit spreads. */
const PROPAGATE_DEBOUNCE_MS = 1000;

interface LiveSettingsPanelProps {
  activity: HostedActivity;
  /** Characters a live chat is using right now — their rows can't be removed. */
  characterIdsInUse: ReadonlySet<string>;
  onActivityChange: (activity: HostedActivity) => void;
}

/**
 * Everything from setup, editable mid-activity — the same flat layout the
 * teacher learned on the setup form, built from the same field components
 * and validation. Edits propagate on a 1-second typing pause; an invalid
 * in-between state (an emptied name, a duplicate, a bad email) shows its
 * inline error while the last valid value stays in effect everywhere.
 * See DECISIONS.md → "Teacher live activity page".
 */
export function LiveSettingsPanel({
  activity,
  characterIdsInUse,
  onActivityChange,
}: LiveSettingsPanelProps) {
  const [draft, setDraft] = useState<LiveActivityDraft>(() =>
    liveDraftFromActivity(activity)
  );

  const committedIds = useMemo(
    () => new Set(activity.characters.map((c) => c.id)),
    [activity]
  );
  const problems = useMemo(
    () => validateLiveDraft(draft, committedIds),
    [draft, committedIds]
  );
  const problemFor = (field: SetupField): string | undefined =>
    problems.find((problem) => problem.field === field)?.message;

  // Debounced propagation: the inputs update on every keystroke, the
  // activity only after the teacher pauses — so half-typed names never
  // flash across chat cards. Invalid drafts simply don't commit.
  const activityRef = useRef(activity);
  const onChangeRef = useRef(onActivityChange);
  useEffect(() => {
    activityRef.current = activity;
    onChangeRef.current = onActivityChange;
  });
  const skipInitialCommit = useRef(true);
  useEffect(() => {
    if (skipInitialCommit.current) {
      skipInitialCommit.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const committed = new Set(
        activityRef.current.characters.map((c) => c.id)
      );
      if (validateLiveDraft(draft, committed).length === 0) {
        onChangeRef.current(activityFromLiveDraft(draft, activityRef.current));
      }
    }, PROPAGATE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [draft]);

  const patch = (changes: Partial<LiveActivityDraft>) =>
    setDraft((prev) => ({ ...prev, ...changes }));
  const patchSettings = (changes: Partial<ActivitySettings>) =>
    setDraft((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...changes },
    }));

  const updateCharacter = (
    id: string,
    changes: Partial<Pick<CharacterRowState, "name" | "emoji">>
  ) =>
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
            characters: [
              ...prev.characters,
              // The row's id IS the character's permanent id — minted now so
              // a later rename can never orphan a running chat's labels.
              { id: mintLiveCharacterId(), name: "" },
            ],
          }
    );

  const removeCharacter = (id: string) => {
    const next: LiveActivityDraft = {
      ...draft,
      characters: draft.characters.filter((row) => row.id !== id),
    };
    setDraft(next);
    // Removal is a click, not typing: a removed character must stop being
    // offered to future pairings immediately, not a debounce later. (The
    // debounce tick re-commits the same draft afterwards — harmless.)
    if (validateLiveDraft(next, committedIds).length === 0) {
      onActivityChange(activityFromLiveDraft(next, activity));
    }
  };

  const hostNameError = problemFor("hostName");
  const emailError = problemFor("teacherEmail");
  const sceneWords = countWords(draft.scene);

  return (
    <CollapsibleSection
      title="Edit activity settings"
      icon={SlidersHorizontal}
      accent="mint"
      defaultOpen={false}
      collapsedHint={
        activity.teacherEmail
          ? "Everything from setup, still editable while the activity runs"
          : "No email yet. Add yours to get every chat sent to you afterward"
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Changes reach everyone the moment you pause typing, including what
        students see mid-chat. The natural time to switch up the characters or
        the scene is between rounds.
      </p>

      <div className="mt-6 flex flex-col gap-7">
        <div>
          <SectionLabel>Characters</SectionLabel>
          <div className="mt-3">
            <CharacterRowsField
              rows={draft.characters}
              onUpdate={updateCharacter}
              onAdd={addCharacter}
              onRemove={removeCharacter}
              problemFor={problemFor}
              registerField={() => () => undefined}
              removeGuard={(row) =>
                characterIdsInUse.has(row.id)
                  ? "In a live chat right now. You can remove them once that chat ends."
                  : null
              }
            />
          </div>
        </div>

        <div>
          <SectionLabel>About you</SectionLabel>
          <div className="mt-3 flex flex-col gap-5">
            <div>
              <FieldLabelRow htmlFor="host-edit-name" label="Your name">
                <LimitCounter
                  count={charCount(draft.hostName)}
                  max={NAME_MAX_CHARS}
                  showFrom={NAME_COUNTER_FROM}
                />
              </FieldLabelRow>
              <Input
                id="host-edit-name"
                value={draft.hostName}
                onChange={(event) =>
                  patch({
                    hostName: clampChars(event.target.value, NAME_MAX_CHARS),
                  })
                }
                aria-invalid={hostNameError ? true : undefined}
              />
              <FieldError message={hostNameError} className="mt-1.5" />
            </div>

            <div>
              <FieldLabelRow
                htmlFor="host-edit-email"
                label="Your email"
                optional
              />
              <Input
                id="host-edit-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={draft.teacherEmail}
                onChange={(event) =>
                  patch({ teacherEmail: event.target.value })
                }
                placeholder="you@school.org"
                aria-invalid={emailError ? true : undefined}
              />
              {emailError ? (
                <FieldError message={emailError} className="mt-1.5" />
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We'll email you every chat from the activity once it wraps up.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>The scene</SectionLabel>
          <div className="mt-3">
            <Textarea
              rows={2}
              value={draft.scene}
              onChange={(event) =>
                patch({
                  scene: clampWords(event.target.value, SCENE_MAX_WORDS),
                })
              }
              aria-label="Scene"
              placeholder="Rome, 44 BC, the night before the Ides of March…"
            />
            {sceneWords >= SCENE_COUNTER_FROM && (
              <div className="mt-1.5 flex justify-end">
                <LimitCounter
                  count={sceneWords}
                  max={SCENE_MAX_WORDS}
                  showFrom={SCENE_COUNTER_FROM}
                  unit="words"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionLabel>Settings</SectionLabel>
          <div className="mt-1">
            <SettingsSection
              bare
              settings={draft.settings}
              onChange={patchSettings}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
