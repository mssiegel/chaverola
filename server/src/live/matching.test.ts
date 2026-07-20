import { describe, expect, it } from "vitest";

import {
  CHAT_TRANSCRIPT_MAX_LINES,
  DEFAULT_ACTIVITY_SETTINGS,
} from "@chaverola/shared";
import type { Character } from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import {
  appendLine,
  createChat,
  markInactive,
  planPairEveryone,
} from "./matching";
import { createSeatState } from "./seats";
import type { Seat } from "./seats";

/*
  Deliberately light (see the feature-3 plan): the eligibility filter, the
  character deal, the odd-count branch, the below-2 ending, and the
  transcript's safety rules (membership guard, the line cap) — the pure
  rules a browser pass can't cheaply pin. Everything else (even counts,
  clamping, removals, timing) is covered by the feature prompts' browser
  passes.
*/

function makeActivity(characters: Character[]): StoredActivity {
  return {
    joinCode: "5678",
    hostKey: "AAAAAAAAAAAAAAAAAAAAAAAA",
    hostName: "Ms. Cohen",
    characters,
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    createdAt: 0,
    lastSeenAt: 0,
    seats: createSeatState(),
    chats: [],
    leftoverStudentId: null,
  };
}

let seatCounter = 0;
function addSeat(
  activity: StoredActivity,
  overrides: Partial<Seat> = {}
): Seat {
  seatCounter += 1;
  const seat: Seat = {
    studentId: `student-${seatCounter}`,
    token: `token-${seatCounter}`,
    name: `Student ${seatCounter}`,
    joinedAt: seatCounter * 1_000, // later seats joined later
    connected: true,
    currentSocketId: `socket-${seatCounter}`,
    wrappingUp: false,
    timers: {},
    ...overrides,
  };
  activity.seats.byId.set(seat.studentId, seat);
  return seat;
}

const ROSTER: Character[] = [
  { id: "brutus", name: "Brutus" },
  { id: "caesar", name: "Caesar" },
  { id: "cicero", name: "Cicero" },
  { id: "cleopatra", name: "Cleopatra" },
];

describe("createChat", () => {
  it("seats only eligible students and no-ops under 2", () => {
    const activity = makeActivity(ROSTER);
    const eligible = addSeat(activity);
    const reconnecting = addSeat(activity, { connected: false });
    const wrappingUp = addSeat(activity, { wrappingUp: true });
    const matched = addSeat(activity);
    const partner = addSeat(activity);
    activity.chats.push({
      id: "existing",
      members: [
        {
          studentId: matched.studentId,
          name: matched.name,
          characterId: "brutus",
        },
        {
          studentId: partner.studentId,
          name: partner.name,
          characterId: "caesar",
        },
      ],
      inactiveStudentIds: [],
      lines: [],
      startedAt: 0,
      status: "active",
      endReason: null,
    });
    const requested = [
      eligible.studentId,
      reconnecting.studentId,
      wrappingUp.studentId,
      matched.studentId,
    ];

    // Only one of the four is eligible — under 2, so nothing starts.
    expect(createChat(activity, requested, 10_000)).toBeNull();
    expect(activity.chats).toHaveLength(1);

    const second = addSeat(activity);
    const chat = createChat(activity, [...requested, second.studentId], 10_000);
    expect(chat).not.toBeNull();
    expect(chat!.members.map((m) => m.studentId).sort()).toEqual(
      [eligible.studentId, second.studentId].sort()
    );
  });

  it("deals exactly the roster's first N characters, each once", () => {
    const activity = makeActivity(ROSTER);
    const seats = [addSeat(activity), addSeat(activity), addSeat(activity)];

    const chat = createChat(
      activity,
      seats.map((s) => s.studentId),
      10_000
    );
    expect(chat).not.toBeNull();
    expect(chat!.members.map((m) => m.characterId).sort()).toEqual([
      "brutus",
      "caesar",
      "cicero",
    ]);
  });
});

describe("planPairEveryone (the odd-count branch)", () => {
  it("seats a trailing trio when the roster has a 3rd character", () => {
    const activity = makeActivity(ROSTER);
    const seats = Array.from({ length: 5 }, () => addSeat(activity));

    const plan = planPairEveryone(activity);
    expect(plan).not.toBeNull();
    expect(plan!.leftoverStudentId).toBeNull();
    expect(plan!.groups).toEqual([
      [seats[0]!.studentId, seats[1]!.studentId],
      [seats[2]!.studentId, seats[3]!.studentId, seats[4]!.studentId],
    ]);
  });

  it("marks the newest joiner as the leftover on a 2-character roster", () => {
    const activity = makeActivity(ROSTER.slice(0, 2));
    const seats = Array.from({ length: 3 }, () => addSeat(activity));

    const plan = planPairEveryone(activity);
    expect(plan).not.toBeNull();
    expect(plan!.leftoverStudentId).toBe(seats[2]!.studentId);
    expect(plan!.groups).toEqual([[seats[0]!.studentId, seats[1]!.studentId]]);
  });
});

describe("markInactive", () => {
  it('ends the chat with reason "teacher" when active membership drops below 2', () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;

    const result = markInactive(activity, chat.id, a.studentId);
    expect(result).toEqual({ ended: true, chat });
    expect(chat.status).toBe("ended");
    expect(chat.endReason).toBe("teacher");
  });
});

describe("appendLine", () => {
  it("appends for an active member, stamping id and time", () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;

    const result = appendLine(activity, chat.id, a.studentId, "hi", 11_000);
    expect(result).toBeDefined();
    expect(result!.chat).toBe(chat);
    expect(result!.line.id).toBeTruthy();
    expect(result!.line).toMatchObject({
      studentId: a.studentId,
      text: "hi",
      sentAt: 11_000,
    });
    expect(chat.lines).toEqual([result!.line]);
  });

  it("refuses non-members, inactive members, and ended chats", () => {
    const activity = makeActivity(ROSTER);
    const [a, b, c] = [addSeat(activity), addSeat(activity), addSeat(activity)];
    const trio = createChat(
      activity,
      [a.studentId, b.studentId, c.studentId],
      10_000
    )!;
    const outsider = addSeat(activity);

    expect(
      appendLine(activity, trio.id, outsider.studentId, "hi", 11_000)
    ).toBeUndefined();

    markInactive(activity, trio.id, c.studentId); // trio continues without c
    expect(
      appendLine(activity, trio.id, c.studentId, "hi", 11_000)
    ).toBeUndefined();

    markInactive(activity, trio.id, b.studentId); // below 2 — the chat ends
    expect(
      appendLine(activity, trio.id, a.studentId, "hi", 11_000)
    ).toBeUndefined();
    expect(trio.lines).toEqual([]);
  });

  it("caps the transcript, dropping the oldest line", () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;
    for (let i = 0; i < CHAT_TRANSCRIPT_MAX_LINES; i++) {
      chat.lines.push({
        id: `line-${i}`,
        studentId: a.studentId,
        text: `line ${i}`,
        sentAt: 10_000 + i,
      });
    }

    const result = appendLine(activity, chat.id, b.studentId, "newest", 20_000);
    expect(result).toBeDefined();
    expect(chat.lines).toHaveLength(CHAT_TRANSCRIPT_MAX_LINES);
    // `!` — length just pinned to the (non-zero) cap.
    expect(chat.lines[0]!.id).toBe("line-1"); // line-0 dropped
    expect(chat.lines[chat.lines.length - 1]!).toBe(result!.line);
  });
});
