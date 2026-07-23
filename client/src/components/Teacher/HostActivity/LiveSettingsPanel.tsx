import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { AboutYouFields } from "@/components/Teacher/ActivitySetup/AboutYouFields";
import { CharacterRowsField } from "@/components/Teacher/ActivitySetup/CharacterRowsField";
import { makeDraftPatches } from "@/components/Teacher/ActivitySetup/draftPatches";
import { SceneField } from "@/components/Teacher/ActivitySetup/SceneField";
import { SettingsSection } from "@/components/Teacher/ActivitySetup/SettingsSection";
import { SectionLabel } from "@/components/ui/section-label";
import { type SetupField } from "@/lib/activitySetup";
import {
  activityFromLiveDraft,
  liveDraftFromActivity,
  mergeExternalSettings,
  mintLiveCharacterId,
  validateLiveDraft,
  type LiveActivityDraft,
} from "@/lib/hostActivity";
import { useLatestRef } from "@/lib/useLatestRef";
import type { HostedActivity } from "@/types/activity";

import { CollapsibleSection } from "./CollapsibleSection";

/** How long the teacher pauses typing before an edit spreads. */
const PROPAGATE_DEBOUNCE_MS = 1000;

interface LiveSettingsPanelProps {
  activity: HostedActivity;
  /** Characters a live chat is using right now — their rows can't be removed. */
  characterIdsInUse: ReadonlySet<string>;
  /**
   * Every chat is paused. Purely presentational here: it reaches the
   * auto-match row's description and nothing else, so it can never enter the
   * draft or trigger a commit.
   */
  paused: boolean;
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
  paused,
  onActivityChange,
}: LiveSettingsPanelProps) {
  const [draft, setDraft] = useState<LiveActivityDraft>(() =>
    liveDraftFromActivity(activity)
  );

  // Settings can change outside this panel too — the pairing rail's
  // auto-match switch, End-all's auto-hold. Those changes must reach this
  // draft, or its next commit would quietly put the old value back. Only
  // keys that actually moved merge in, so half-typed text and pending edits
  // to other settings survive, and the panel's own commits echo through as
  // no-ops (mergeExternalSettings returns null, setDraft bails).
  const prevSettingsRef = useRef(activity.settings);
  useEffect(() => {
    const prev = prevSettingsRef.current;
    prevSettingsRef.current = activity.settings;
    setDraft((d) => {
      const merged = mergeExternalSettings(prev, activity.settings, d.settings);
      return merged ? { ...d, settings: merged } : d;
    });
  }, [activity.settings]);

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
  const activityRef = useLatestRef(activity);
  const onChangeRef = useLatestRef(onActivityChange);
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
  }, [draft, activityRef, onChangeRef]);

  // The added row's id IS the character's permanent id — minted on add so a
  // later rename can never orphan a running chat's labels.
  const { patch, patchSettings, updateCharacter, addCharacter } =
    makeDraftPatches(setDraft, mintLiveCharacterId);

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

  return (
    <CollapsibleSection
      title="Edit activity settings"
      icon={SlidersHorizontal}
      accent="mint"
      defaultOpen={false}
      // An invitation, never a claim about whether an email exists: the
      // address lives on the server and changing it emits no echo, so a
      // second host device can be looking at a stale empty field long after
      // the first one set it.
      collapsedHint={
        activity.teacherEmail
          ? "Everything from setup, still editable while the activity runs"
          : "Add your email and we'll send you every chat when the activity wraps up"
      }
    >
      {/* Only what actually travels gets promised. Settings and the email
          reach the server on the 1-second pause; characters, the scene and
          the host name are still local to this tab (founder call
          2026-07-19), so students keep the setup copy and a refetch drops
          the edit. Features 17 and 18 widen this line as their sync ships —
          to their own scope, never back to "what students see mid-chat".
          See DECISIONS.md → "The live settings panel only claims the edits
          that actually travel". */}
      <p className="text-sm leading-relaxed text-muted-foreground">
        Settings and your email save as soon as you pause typing. Characters,
        the scene and your name only change this page for now: students still
        see what you set up, and refreshing undoes those edits.
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
              removeGuard={(row) => {
                if (!characterIdsInUse.has(row.id)) return null;
                // Name who's locked with the committed name — that's what
                // the running chat shows, even mid-rename.
                const committed = activity.characters.find(
                  (c) => c.id === row.id
                );
                const name =
                  committed?.name.trim() || row.name.trim() || "This character";
                return `${name} is in a live chat right now. You can remove them once that chat ends.`;
              }}
            />
          </div>
        </div>

        <div>
          <SectionLabel>About you</SectionLabel>
          <AboutYouFields
            className="mt-3"
            hostName={draft.hostName}
            teacherEmail={draft.teacherEmail}
            onPatch={patch}
            hostNameError={hostNameError}
            emailError={emailError}
            idPrefix="host-edit"
          />
        </div>

        <div>
          <SectionLabel>The scene</SectionLabel>
          <div className="mt-3">
            <SceneField
              value={draft.scene}
              onChange={(scene) => patch({ scene })}
            />
          </div>
        </div>

        <div>
          <SectionLabel>Settings</SectionLabel>
          <div className="mt-1">
            <SettingsSection
              bare
              settings={draft.settings}
              paused={paused}
              onChange={patchSettings}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
