import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";

import type { StoredActivity } from "./activityStore";
import { toActivity, toHostedActivity } from "./projections";

// The privacy invariant, pinned as exact key allowlists: a field added to
// StoredActivity stays private until someone adds it to a projection AND
// updates the matching list here on purpose.

const fullRecord: StoredActivity = {
  joinCode: "5678",
  hostKey: "AAAAAAAAAAAAAAAAAAAAAAAA",
  hostName: "Ms. Cohen",
  characters: [
    { id: "brutus", name: "Brutus", emoji: "🔪" },
    { id: "caesar", name: "Caesar" },
  ],
  scenario: "Rome, 44 BC, the night before the Ides of March.",
  teacherEmail: "cohen@example.com",
  settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  createdAt: 1_000,
  lastSeenAt: 1_000,
};

describe("toActivity (student projection)", () => {
  it("exposes exactly the public fields — no teacherEmail, settings, or hostKey", () => {
    expect(Object.keys(toActivity(fullRecord)).sort()).toEqual([
      "characters",
      "hostName",
      "joinCode",
      "scenario",
    ]);
  });
});

describe("toHostedActivity (teacher projection)", () => {
  it("adds the teacher-only setup fields but never the hostKey", () => {
    expect(Object.keys(toHostedActivity(fullRecord)).sort()).toEqual([
      "characters",
      "hostName",
      "joinCode",
      "scenario",
      "settings",
      "teacherEmail",
    ]);
  });
});
