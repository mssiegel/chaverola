import { LOBBY_DISCONNECT_BROADCAST_DELAY_MS } from "@chaverola/shared";
import type { Activity, HostedActivity, QueueEntry } from "@chaverola/shared";

import type { Seat } from "../live/seats";
import type { StoredActivity } from "./activityStore";

/*
  The only module allowed to turn stored records into response JSON. Every
  projection is an explicit field-by-field literal — never a spread, never a
  delete — so a new StoredActivity field is private until someone adds it
  here on purpose. The privacy tests pin the exact key lists.
*/

/** The student projection: no teacherEmail, no settings, no hostKey. */
export function toActivity(stored: StoredActivity): Activity {
  const activity: Activity = {
    joinCode: stored.joinCode,
    hostName: stored.hostName,
    characters: stored.characters,
  };
  if (stored.scenario !== undefined) activity.scenario = stored.scenario;
  return activity;
}

/** The teacher projection: everything students see plus the teacher-only
 *  setup fields. The hostKey stays out — it lives only in the URL. */
export function toHostedActivity(stored: StoredActivity): HostedActivity {
  const activity: HostedActivity = {
    joinCode: stored.joinCode,
    hostName: stored.hostName,
    characters: stored.characters,
    settings: stored.settings,
  };
  if (stored.scenario !== undefined) activity.scenario = stored.scenario;
  if (stored.teacherEmail !== undefined) {
    activity.teacherEmail = stored.teacherEmail;
  }
  return activity;
}

/** The teacher's queue row. NEVER the token. `connection` stays "connected"
 *  through the first LOBBY_DISCONNECT_BROADCAST_DELAY_MS of a drop — a
 *  refresh reconnects in ~1–2s and shouldn't flash the row. The delay gates
 *  only this teacher-facing state, never the grace clock. */
export function toQueueEntry(seat: Seat, now: number): QueueEntry {
  const reconnecting =
    !seat.connected &&
    seat.disconnectedAt !== undefined &&
    now - seat.disconnectedAt >= LOBBY_DISCONNECT_BROADCAST_DELAY_MS;
  return {
    id: seat.studentId,
    name: seat.name,
    waitSeconds: Math.max(0, Math.floor((now - seat.joinedAt) / 1000)),
    connection: reconnecting ? "reconnecting" : "connected",
  };
}

/** The student's lobby:welcome payload — exactly the resume pair. */
export function toLobbyWelcome(seat: Seat): {
  studentId: string;
  token: string;
} {
  return {
    studentId: seat.studentId,
    token: seat.token,
  };
}
