import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";

import type { StoredChat } from "../live/matching";
import { createSeatState } from "../live/seats";
import type { Seat } from "../live/seats";
import type { StoredActivity } from "./activityStore";
import {
  toActivity,
  toChatEnded,
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
  lastPartners: {},
  leftoverStudentId: null,
  rematchNotice: null,
  pausedAt: null,
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

describe("toLobbyWelcome (student resume pair + pause state)", () => {
  it("exposes exactly studentId, token, and paused", () => {
    expect(Object.keys(toLobbyWelcome(fullSeat, fullRecord)).sort()).toEqual([
      "paused",
      "studentId",
      "token",
    ]);
  });
});

describe("toChatSnapshot (teacher chat card)", () => {
  it("exposes exactly the card fields, each participant never a token", () => {
    const snapshot = toChatSnapshot(fullChat, fullRecord, 30_000);
    expect(Object.keys(snapshot).sort()).toEqual([
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
  // Noa (student-2, the one active peer) is mid-drop at now = 30_000:
  // disconnected 10s ago — past the 4s broadcast gate, 110s from reaping —
  // so the reconnectingPeers backlog below is non-empty and its entry pin
  // does real work. A full Seat (token included) hangs off the record; the
  // projection must leak none of it.
  const droppedSeat: Seat = {
    ...fullSeat,
    studentId: "student-2",
    token: "SECRET_SEAT_TOKEN_BBBBBB",
    name: "Noa",
    connected: false,
    currentSocketId: "socket-2",
    disconnectedAt: 20_000,
  };
  const record: StoredActivity = { ...fullRecord, seats: createSeatState() };
  record.seats.byId.set(droppedSeat.studentId, droppedSeat);

  it("carries characterIds only — no names, no studentIds", () => {
    const started = toChatStarted(fullChat, record, "student-1", 30_000);
    expect(Object.keys(started).sort()).toEqual([
      "chatId",
      "everPeers",
      "lines",
      "peers",
      "reconnectingPeers",
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
    const started = toChatStarted(fullChat, record, "student-1", 30_000);
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

  it("projects the offline backlog as characterId + seconds — never the seat", () => {
    const started = toChatStarted(fullChat, record, "student-1", 30_000);
    // Guard the loop below, same as the lines pin: an empty backlog would
    // pass the key pin while proving nothing.
    expect(started.reconnectingPeers).toHaveLength(1);
    for (const peer of started.reconnectingPeers) {
      expect(Object.keys(peer).sort()).toEqual(["characterId", "secondsLeft"]);
    }
    // `!` — length pinned to 1 just above. 110 = 120s grace minus the 10s
    // already spent dark.
    expect(started.reconnectingPeers[0]!).toEqual({
      characterId: "caesar",
      secondsLeft: 110,
    });
  });
});

describe("toPeerTyping (the student typing signal)", () => {
  it("exposes exactly chatId and the typist's characterId", () => {
    const typing = toPeerTyping(fullChat, "student-1");
    expect(Object.keys(typing).sort()).toEqual(["characterId", "chatId"]);
    expect(typing.characterId).toBe("brutus");
  });
});

describe("toChatEnded (the one sanctioned name-reveal exception)", () => {
  it("carries NO reveal — no real name reaches a peer — when the setting is off", () => {
    const recordOff: StoredActivity = {
      ...fullRecord,
      settings: { ...fullRecord.settings, revealNames: false },
    };
    const ended = toChatEnded(fullChat, recordOff, "student-1");
    // Exactly `reason` — the reveal key never appears, so a real name can't
    // ride the ended wire unless the teacher asked for it.
    expect(Object.keys(ended)).toEqual(["reason"]);
  });

  it("reveals every OTHER member — everyone ever in the room, never self — when the setting is on", () => {
    // fullRecord uses DEFAULT_ACTIVITY_SETTINGS (revealNames on).
    const ended = toChatEnded(fullChat, fullRecord, "student-1");
    expect(Object.keys(ended).sort()).toEqual(["reason", "reveal"]);
    // Rachel (student-1) is the recipient — her own name is never in her
    // reveal. Both peers are listed, including the INACTIVE Dana (name
    // captured at chat start survives her departure).
    expect(ended.reveal).toEqual([
      { characterId: "caesar", name: "Noa" },
      { characterId: "cicero", name: "Dana" },
    ]);
  });
});
