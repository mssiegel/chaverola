import { TypingDots } from "@/components/chat/TypingDots";
import { MaskDoodle, SparkleDoodle } from "@/components/decor/doodles";
import { SectionLabel } from "@/components/ui/section-label";
import { isFilledCharacter } from "@/lib/activitySetup";

import type { CharacterRowState } from "./CharacterRowsField";

interface LobbyPreviewProps {
  hostName: string;
  scene: string;
  characters: CharacterRowState[];
}

/**
 * The live "what students see" card beside the desktop form: a miniature of
 * the real student lobby (WaitingLobby) on its purple world, fed by the
 * draft as the teacher types. Mirrors the lobby's markup — uppercase labels,
 * secondary roster chips, the waiting pill — so the preview stays honest.
 * Display-only: no live regions, so it never talks over the form.
 */
export function LobbyPreview({
  hostName,
  scene,
  characters,
}: LobbyPreviewProps) {
  const cast = characters.filter(isFilledCharacter);
  const host = hostName.trim();
  const sceneText = scene.trim();

  return (
    <div>
      <SectionLabel>What students see</SectionLabel>

      <div className="student-world-bg relative mt-3 overflow-hidden rounded-3xl p-4 shadow-md">
        {/* Static scatter of the student world's doodles — decoration only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 text-white"
        >
          <MaskDoodle className="absolute -top-1 -left-2 w-14 -rotate-12 opacity-50" />
          <SparkleDoodle className="absolute top-2 right-1 w-8 rotate-12 opacity-60" />
        </div>

        {/* The waiting pill floats on the purple, exactly like the real
            lobby, with the info card below it. */}
        <div className="relative flex flex-col items-center gap-3 pt-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-grape/25 bg-brand-grape-soft px-3 py-1.5 text-xs font-semibold text-brand-grape-strong">
            Waiting for your match
            <TypingDots dotClassName="bg-brand-mint" aria-hidden />
          </div>

          <div className="w-full space-y-4 rounded-2xl bg-card/95 p-4 shadow-sm">
            <div>
              <SectionLabel>Hosted by</SectionLabel>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {host || "…"}
              </p>
            </div>

            {sceneText && (
              <div>
                <SectionLabel>The scene</SectionLabel>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                  {sceneText}
                </p>
              </div>
            )}

            <div>
              <SectionLabel>Characters in this activity</SectionLabel>
              {cast.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {cast.map((character) => (
                    <li
                      key={character.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {character.emoji && (
                        <span aria-hidden>{character.emoji}</span>
                      )}
                      {character.name.trim()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  Your characters show up here once you name them.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        This is the lobby your class waits in. It fills in as you type.
      </p>
    </div>
  );
}
