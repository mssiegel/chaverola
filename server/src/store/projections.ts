import type { Activity, HostedActivity } from "@chaverola/shared";

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
