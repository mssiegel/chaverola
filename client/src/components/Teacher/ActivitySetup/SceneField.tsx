import { SCENE_MAX_CHARS } from "@chaverola/shared";
import { Textarea } from "@/components/ui/textarea";
import { SCENE_COUNTER_FROM, SCENE_MAX_WORDS } from "@/lib/activitySetup";
import { clampWords, countWords } from "@/lib/text";

import { LimitCounter } from "./FieldFeedback";

/**
 * The 20-word scene textarea with its quiet word counter — identical on the
 * setup form and the host page's live panel. The word cap is clamped here.
 */
export function SceneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (scene: string) => void;
}) {
  const words = countWords(value);
  return (
    <>
      {/* The word clamp is the real limit; maxLength is the server's hard
          char backstop, so the form can't accept what the API rejects. */}
      <Textarea
        rows={2}
        value={value}
        maxLength={SCENE_MAX_CHARS}
        onChange={(event) =>
          onChange(clampWords(event.target.value, SCENE_MAX_WORDS))
        }
        aria-label="Scene"
        placeholder="Rome, 44 BC, the night before the Ides of March…"
      />
      {words >= SCENE_COUNTER_FROM && (
        <div className="mt-1.5 flex justify-end">
          <LimitCounter
            count={words}
            max={SCENE_MAX_WORDS}
            showFrom={SCENE_COUNTER_FROM}
            unit="words"
          />
        </div>
      )}
    </>
  );
}
