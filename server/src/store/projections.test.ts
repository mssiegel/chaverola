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
  toPeerTyping,
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
    { id: "cicero", name: "Cicero" },
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

// The third member is INACTIVE on purpose: with only active members,
// `peers` and `everPeers` project identically and wiring everPeers to
// activeMembers would pass anyway. The departed member is what tells the
// two rosters apart.
const fullChat: StoredChat = {
  id: "chat-1",
  members: [
    { studentId: "student-1", name: "Rachel", characterId: "brutus" },
    { studentId: "student-2", name: "Noa", characterId: "caesar" },
    { studentId: "student-3", name: "Dana", characterId: "cicero" },
  ],
  inactiveStudentIds: ["student-3"],
  lines: [
    { id: "line-1", studentId: "student-2", text: "Et tu?", sentAt: 21_000 },
  ],
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
      "messages",
      "participants",
      "reconnectingStudentIds",
      "status",
    ]);
    expect(snapshot.participants).toHaveLength(3);
    for (const participant of snapshot.participants) {
      expect(Object.keys(participant).sort()).toEqual([
        "character",
        "id",
        "name",
      ]);
    }
  });

  it("projects transcript lines with the sender resolved off the members", () => {
    const snapshot = toChatSnapshot(fullChat, fullRecord, 30_000);
    // Guard the loop below against a fixture regression to lines: [] —
    // an empty array would pass the key pin while proving nothing.
    expect(snapshot.messages).toHaveLength(1);
    for (const line of snapshot.messages) {
      expect(Object.keys(line).sort()).toEqual([
        "characterId",
        "id",
        "name",
        "sentAt",
        "studentId",
        "text",
      ]);
    }
    // `!` — length pinned to 1 just above. The name and characterId are
    // the resolved sender's, not anyone else's.
    expect(snapshot.messages[0]!).toMatchObject({
      studentId: "student-2",
      name: "Noa",
      characterId: "caesar",
      text: "Et tu?",
    });
  });
});

describe("toChatStarted (the student wire)", () => {
  it("carries characterIds only — no names, no studentIds", () => {
    const started = toChatStarted(fullChat, "student-1");
    expect(Object.keys(started).sort()).toEqual([
      "chatId",
      "everPeers",
      "lines",
      "peers",
      "selfCharacterId",
    ]);
    // peers is the ACTIVE roster (the inactive third member is out);
    // everPeers is everyone ever, which is what a resumed client rebuilds
    // lines and colors from.
    expect(started.peers).toHaveLength(1);
    expect(started.everPeers).toHaveLength(2);
    for (const peer of [...started.peers, ...started.everPeers]) {
      expect(Object.keys(peer)).toEqual(["characterId"]);
    }
  });

  it("projects lines as characterId-only — no studentId, no name", () => {
    const started = toChatStarted(fullChat, "student-1");
    // Guard the loop below against a fixture regression to lines: [] —
    // an empty array would pass the key pin while proving nothing.
    expect(started.lines).toHaveLength(1);
    for (const line of started.lines) {
      expect(Object.keys(line).sort()).toEqual([
        "characterId",
        "id",
        "sentAt",
        "text",
      ]);
    }
    // `!` — length pinned to 1 just above.
    expect(started.lines[0]!.characterId).toBe("caesar");
  });
});

describe("toPeerTyping (the student typing signal)", () => {
  it("exposes exactly chatId and the typist's characterId", () => {
    const typing = toPeerTyping(fullChat, "student-1");
    expect(Object.keys(typing).sort()).toEqual(["characterId", "chatId"]);
    expect(typing.characterId).toBe("brutus");
  });
});
