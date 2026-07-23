import { DEMO_JOIN_CODE } from "@chaverola/shared";
import type { Activity } from "@/types/activity";

/*
  The one mock activity behind the student join flow. Per the project brief,
  the demo join code `1234` always works, fully client-simulated; real codes
  resolve over the API. DEMO_JOIN_CODE itself lives in @chaverola/shared
  (the server refuses to issue or answer for it) and is re-exported here.
*/

export { DEMO_JOIN_CODE };

/**
 * The name waiting in the demo's name field, so demo entries (the homepage's
 * "Try the student side", /demo/student) are one click from the lobby.
 * Deliberately absent from every pretend roster, so the demo never shows two
 * Rachels side by side.
 */
export const DEMO_STUDENT_NAME = "Rachel";

export const demoActivity: Activity = {
  joinCode: DEMO_JOIN_CODE,
  hostName: "Ms. Cohen",
  // 19 words on purpose: the scene counter appears at 16 and turns red at
  // the 20-word cap, so this sits one under — the demo shows the counter
  // working instead of a seeded scene that reads as an error. Keep any
  // rewrite at 16-19 words.
  scenario:
    "Rome, on the Ides of March. A rumor is going around the forum, and " +
    "nobody knows who to trust.",
  characters: [
    { id: "caesars-ghost", name: "Caesar's ghost", emoji: "👻" },
    { id: "brutus", name: "Brutus", emoji: "🔪" },
    { id: "cleopatra", name: "Cleopatra", emoji: "👑" },
    // No emoji on purpose: emojis are per-character optional, and the demo
    // roster should exercise the name-only path somewhere visible.
    { id: "marc-antony", name: "Marc Antony" },
  ],
};
