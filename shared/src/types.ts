/*
  The canonical domain types shared by the client and the server. Handwritten
  interfaces here are the wire contract; the server's zod schemas are pinned
  to them (schema drift is a compile error server-side).
*/

export interface Character {
  id: string;
  /** Display name, e.g. "Caesar's ghost". */
  name: string;
  /**
   * A single emoji shown with the name, e.g. "👻". Optional: the teacher
   * decides per character whether it gets one, and every label simply
   * drops it when absent (see lib/characterLabel).
   */
  emoji?: string;
}

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

/**
 * The teacher's activity settings, chosen at setup and editable while the
 * activity runs (Chaverola is a series of activities with the same students,
 * so nothing is locked in). The defaults — everything on — are the
 * recommended state; see DEFAULT_ACTIVITY_SETTINGS in constants.ts.
 */
export interface ActivitySettings {
  /** Students learn who they were really chatting with once a chat ends. */
  revealNames: boolean;
  /** End every chat automatically after `autoEndMinutes`. */
  autoEndChats: boolean;
  /** Whole minutes, 1–30. Kept (but inert) while `autoEndChats` is off. */
  autoEndMinutes: number;
  /** Warn the teacher before pairing students who already chatted together. */
  rematchWarning: boolean;
  /** Pair waiting students 1:1 on their own after `autoMatchSeconds`. */
  autoMatch: boolean;
  /** Seconds, 5–120 in steps of 5. Kept (but inert) while `autoMatch` is off. */
  autoMatchSeconds: number;
}

/**
 * An activity from the teacher's side: everything students see plus the
 * teacher-only fields from the setup form.
 */
export interface HostedActivity extends Activity {
  /** Where to email the activity's chat transcripts, if the teacher asked. */
  teacherEmail?: string;
  settings: ActivitySettings;
}
