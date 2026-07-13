import type { Character } from "./chat";

/**
 * An activity as students see it when joining: who's hosting, which characters
 * are in play, and the optional scene the teacher set for the roleplay.
 */
export interface Activity {
  /** The 4-digit code students type to get in. */
  joinCode: string;
  /** The teacher's display name, e.g. "Ms. Cohen". */
  hostName: string;
  /** The character roster students may be assigned from. */
  characters: Character[];
  /** Optional scene-setting text; not every teacher writes one. */
  scenario?: string;
}
