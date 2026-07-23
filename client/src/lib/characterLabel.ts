import { characterLabel as labelForCharacter } from "@chaverola/shared";

import type { Participant } from "@/types/chat";

/**
 * "<name> <emoji>" for a chat participant — how a character is shown
 * everywhere in chat chrome. Delegates to the shared formatter (the single
 * source for the `name + emoji` join, now used by the server's transcript
 * email too); this wrapper just unwraps the participant's character. Emojis
 * are optional per character, so a character without one renders as just the
 * name, no trailing space.
 */
export function characterLabel({ character }: Participant): string {
  return labelForCharacter(character);
}
