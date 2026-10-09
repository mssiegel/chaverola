import type { Locale } from "@/lib/locale";
import type { Activity } from "@/types/activity";
import type { ChatScenario } from "@/types/chat";

import {
  activityChatScenarios,
  type ActivityChatScenarioKey,
} from "./activityChatDemo";
import { demoActivities, demoStudentNames } from "./activityDemo";
import { heroChatScenarios } from "./heroChatDemo";
import { hostDemoCasts, type HostDemoCast } from "./hostActivityDemo";

/*
  Barrel for mock/demo data. Per the project brief, the demo join code `1234`
  always works, and all mock content is classroom appropriate and fun.

  This is the one sanctioned barrel in the client — package-boundary assembly,
  not a re-export convenience: each file above holds one locale-keyed record,
  and the whole demo is put together here as a single `DemoContent` per
  language. The English and Hebrew casts are separate productions, not
  translations of each other, which is exactly why they live here rather than
  in the i18n catalogs (i18next assumes key parity, and these have none).

  Read it through `useDemoContent()` in `lib/demoContent.ts` — the demo cast
  follows the URL's locale, and a hook doesn't belong in `mockData/`.
*/

export { DEMO_JOIN_CODE } from "./activityDemo";
export { demoHostedActivity } from "./hostActivityDemo";
export type { ActivityChatScenarioKey, HostDemoCast };
export type { HostSeedChat } from "./hostActivityDemo";

/** One language's whole demo: the activity, both sides' casts, the class. */
export interface DemoContent {
  /** The `1234` activity as the student flow resolves it. */
  activity: Activity;
  /** The name waiting in the demo's name field. */
  studentName: string;
  /** The homepage hero's live sample chat. */
  heroScenario: ChatScenario;
  /** The two matches the join flow's demo triggers can start. */
  chatScenarios: Record<ActivityChatScenarioKey, ChatScenario>;
  /** The pretend class behind the teacher's host page. */
  host: HostDemoCast;
}

const contentFor = (locale: Locale): DemoContent => ({
  activity: demoActivities[locale],
  studentName: demoStudentNames[locale],
  heroScenario: heroChatScenarios[locale],
  chatScenarios: activityChatScenarios[locale],
  host: hostDemoCasts[locale],
});

export const DEMO_CONTENT: Record<Locale, DemoContent> = {
  en: contentFor("en"),
  he: contentFor("he"),
};
