import { DEMO_JOIN_CODE } from "@chaverola/shared";
import type { Activity } from "@/types/activity";

/*
  The one mock activity behind the student join flow. Per the project brief,
  the demo join code `1234` always works; every other code is "not found".
  DEMO_JOIN_CODE itself lives in @chaverola/shared (the server refuses to
  issue or answer for it) and is re-exported here.
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
  scenario:
    "Rome, 44 BC, the night before the Ides of March. A rumor is going " +
    "around the forum, and nobody knows who to trust.",
  characters: [
    { id: "caesars-ghost", name: "Caesar's ghost", emoji: "👻" },
    { id: "brutus", name: "Brutus", emoji: "🔪" },
    { id: "cleopatra", name: "Cleopatra", emoji: "👑" },
    // No emoji on purpose: emojis are per-character optional, and the demo
    // roster should exercise the name-only path somewhere visible.
    { id: "marc-antony", name: "Marc Antony" },
  ],
};

/** Mock lookup for the join flow — only the demo activity exists. */
export function findActivityByCode(code: string): Activity | undefined {
  return code === demoActivity.joinCode ? demoActivity : undefined;
}

/**
 * Mock stand-in for the backend handing out a join code when a teacher hosts
 * an activity: any 4-digit code except the demo's `1234`, so a teacher-made
 * activity never masquerades as the always-works demo activity.
 */
export function mockGenerateJoinCode(): string {
  let code = DEMO_JOIN_CODE;
  while (code === DEMO_JOIN_CODE) {
    code = String(Math.floor(1000 + Math.random() * 9000));
  }
  return code;
}
