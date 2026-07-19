import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";

import type { StoredChat } from "../live/matching";
import { createSeatState } from "../live/seats";
import type { Seat } from "../live/seats";
import type { StoredActivity } from "./activityStore";
import {
  toActivity,
  toChatSnapshot,
  toChatStarted,
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
  chats: [],
  leftoverStudentId: null,
};

const fullSeat: Seat = {
  studentId: "student-1",
  token: "SECRET_SEAT_TOKEN_AAAAAA",
  name: "Rachel",
  joinedAt: 10_000,
  connected: true,
  currentSocketId: "socket-1",
  wrappingUp: false,
  nonce: "nonce-1",
  timers: {},
};

const fullChat: StoredChat = {
  id: "chat-1",
  members: [
    { studentId: "student-1", name: "Rachel", characterId: "brutus" },
    { studentId: "student-2", name: "Noa", characterId: "caesar" },
  ],
  inactiveStudentIds: [],
  startedAt: 20_000,
  status: "active",
  endReason: null,
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

describe("toChatSnapshot (teacher chat card)", () => {
  it("exposes exactly the card fields, each participant never a token", () => {
    const snapshot = toChatSnapshot(fullChat, fullRecord, 30_000);
    expect(Object.keys(snapshot).sort()).toEqual([
      "elapsedSeconds",
      "endReason",
      "id",
      "inactiveStudentIds",
      "participants",
      "reconnectingStudentIds",
      "status",
    ]);
    expect(snapshot.participants).toHaveLength(2);
    for (const participant of snapshot.participants) {
      expect(Object.keys(participant).sort()).toEqual([
        "character",
        "id",
        "name",
      ]);
    }
  });
});

describe("toChatStarted (the student wire)", () => {
  it("carries characterIds only — no names, no studentIds", () => {
    const started = toChatStarted(fullChat, "student-1");
    expect(Object.keys(started).sort()).toEqual([
      "chatId",
      "peers",
      "selfCharacterId",
    ]);
    expect(started.peers).toHaveLength(1);
    for (const peer of started.peers) {
      expect(Object.keys(peer)).toEqual(["characterId"]);
    }
  });
});
