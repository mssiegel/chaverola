import type { Activity } from "@/types/activity";

/*
  The one mock activity behind the student join flow. Per the project brief,
  the demo join code `1234` always works; every other code is "not found".
*/

export const DEMO_JOIN_CODE = "1234";

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
    { id: "marc-antony", name: "Marc Antony", emoji: "🗡️" },
  ],
};

/** Mock lookup for the join flow — only the demo activity exists. */
export function findActivityByCode(code: string): Activity | undefined {
  return code === demoActivity.joinCode ? demoActivity : undefined;
}
