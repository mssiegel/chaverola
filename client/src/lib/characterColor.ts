/*
  Character-name colors.

  The chatbox colors each speaker's name (game-chat style). Colors are assigned
  by speaking order within a room and drawn from the `--char-*` design tokens:
  the first key is green, the second golden, the third bluish, the fourth
  purplish, then extra distinct hues after that.

  From the student's view the caller passes their own character first, so "you"
  are always green. See DECISIONS.md → "Character-name colors" for the rule and
  the reasoning behind it.
*/

import type { Participant } from "@/types/chat";

const CHAR_COLOR_VARS = [
  "--char-1",
  "--char-2",
  "--char-3",
  "--char-4",
  "--char-5",
  "--char-6",
  "--char-7",
  "--char-8",
] as const;

/**
 * Assigns a color to every key in the order it first appears. The first key
 * gets `--char-1` (green), the second `--char-2` (golden), and so on; repeated
 * keys keep their first color. Pass the viewer's own character first so it
 * always renders green. Wraps around once there are more speakers than colors.
 */
export function assignCharacterColors(keys: string[]): Map<string, string> {
  const result = new Map<string, string>();
  let next = 0;

  for (const key of keys) {
    if (result.has(key)) continue;
    const index = next % CHAR_COLOR_VARS.length;
    result.set(key, `var(${CHAR_COLOR_VARS[index]})`);
    next += 1;
  }

  return result;
}

/**
 * Room colors from the viewer's seat: seeds the viewer's own character first
 * so "you" are always green; peers then follow in participant order (golden,
 * bluish, purplish, …).
 */
export function selfFirstCharacterColors(
  self: Participant,
  participants: Participant[]
): Map<string, string> {
  return assignCharacterColors([
    self.character.id,
    ...participants.map((p) => p.character.id),
  ]);
}
