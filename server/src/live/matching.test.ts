import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";
import type { Character } from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import { createChat, markInactive, planPairEveryone } from "./matching";
import { createSeatState } from "./seats";
import type { Seat } from "./seats";

/*
  Deliberately light (see the feature-3 plan): the eligibility filter, the
  character deal, the odd-count branch, and the below-2 ending — the pure
  rules a browser pass can't cheaply pin. Everything else (even counts,
  clamping, removals, timing) is covered by the later prompts' browser
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
