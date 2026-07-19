import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";

import { createSeatState } from "../live/seats";
import type { Seat } from "../live/seats";
import type { StoredActivity } from "./activityStore";
import {
  toActivity,
  toHostedActivity,
  toLobbyWelcome,
  toQueueEntry,
} from "./projections";

// The privacy invariant, pinned as exact key allowlists: a field added to
// StoredActivity (or Seat) stays private until someone adds it to a
// projection AND updates the matching list here on purpose.

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
  seats: createSeatState(),
};

const fullSeat: Seat = {
  studentId: "student-1",
  token: "SECRET_SEAT_TOKEN_AAAAAA",
  name: "Rachel",
  joinedAt: 10_000,
  connected: true,
  currentSocketId: "socket-1",
  nonce: "nonce-1",
  timers: {},
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

describe("toQueueEntry (teacher queue row)", () => {
  it("exposes exactly the row fields — never the seat token", () => {
    expect(Object.keys(toQueueEntry(fullSeat, 25_000)).sort()).toEqual([
      "connection",
      "id",
      "name",
      "waitSeconds",
    ]);
  });
});

describe("toLobbyWelcome (student resume pair)", () => {
  it("exposes exactly studentId and token", () => {
    expect(Object.keys(toLobbyWelcome(fullSeat)).sort()).toEqual([
      "studentId",
      "token",
    ]);
  });
});
