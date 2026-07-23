import type { Character } from "./types";

/**
 * "<name> <emoji>" — how a character is shown everywhere in chat chrome, and
 * (as of feature 11) in the server's plain-text transcript email. Emojis are
 * optional per character (the teacher decides), so a character without one
 * renders as just the name, no trailing space. The single formatter: nothing
 * may hand-roll `name + emoji` (see docs/decisions/characters.md). The client
 * keeps a thin Participant-taking wrapper in client/src/lib/characterLabel.ts.
 */
export function characterLabel(character: Character): string {
  return character.emoji
    ? `${character.name} ${character.emoji}`
    : character.name;
}
