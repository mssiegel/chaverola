import type { Participant } from "@/types/chat";

/** "<name> <emoji>" — how a character is shown everywhere in chat chrome. */
export function characterLabel({ character }: Participant): string {
  return `${character.name} ${character.emoji}`;
}

/** Every peer's label joined for the chat header's "with …" line. */
export function peerListLabel(peers: Participant[]): string {
  return peers.map(characterLabel).join(", ");
}
