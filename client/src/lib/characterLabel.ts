import type { Participant } from "@/types/chat";

/**
 * "<name> <emoji>" — how a character is shown everywhere in chat chrome.
 * Emojis are optional per character (the teacher decides), so a character
 * without one renders as just the name, no trailing space.
 */
export function characterLabel({ character }: Participant): string {
  return character.emoji
    ? `${character.name} ${character.emoji}`
    : character.name;
}
