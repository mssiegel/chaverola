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
  endChat,
  findAutoMatchPair,
  markInactive,
  pauseChats,
  planPairEveryone,
  resumeChats,
} from "./matching";
import { createSeatState } from "./seats";
import type { Seat } from "./seats";

/*
  Deliberately light (see the feature-3 plan): the eligibility filter, the
  character deal, the odd-count branch, the below-2 ending, the pause's
  clock shift, and the transcript's safety rules (membership guard, the
  line cap) — the pure rules a browser pass can't cheaply pin. Everything
  else (even counts, clamping, removals, timing) is covered by the feature
  prompts' browser passes.
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
    lastPartners: {},
    leftoverStudentId: null,
    pausedAt: null,
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

  it("writes one-round lastPartners and overwrites on the next chat", () => {
    const activity = makeActivity(ROSTER);
    const a = addSeat(activity);
    const b = addSeat(activity);
    const c = addSeat(activity);

    const first = createChat(activity, [a.studentId, b.studentId], 10_000);
    expect(activity.lastPartners[a.studentId]).toEqual([b.studentId]);
    expect(activity.lastPartners[b.studentId]).toEqual([a.studentId]);

    // End it so A is matchable again, then pair A with C: A's memory is
    // overwritten — A+B is no longer A's previous round (the
    // Bob→Rachel→Shlomo reset the whole heads-up depends on).
    endChat(activity, first!.id);
    createChat(activity, [a.studentId, c.studentId], 20_000);
    expect(activity.lastPartners[a.studentId]).toEqual([c.studentId]);
    expect(activity.lastPartners[c.studentId]).toEqual([a.studentId]);
    expect(activity.lastPartners[b.studentId]).toEqual([a.studentId]);
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

describe("findAutoMatchPair", () => {
  it("prefers fresh, falls back to a non-exact repeat, and never re-forms an exact pair", () => {
    const activity = makeActivity(ROSTER);
    const a = addSeat(activity, { joinedAt: 1_000 });
    const b = addSeat(activity, { joinedAt: 2_000 });
    const c = addSeat(activity, { joinedAt: 3_000 });
    activity.lastPartners = {
      [a.studentId]: [b.studentId],
      [b.studentId]: [a.studentId],
    };

    // All three past a 0s threshold: A+B just chatted, so the fresh pair A+C
    // is taken in queue order rather than rerunning A+B.
    expect(findAutoMatchPair(activity, 0, 100_000)).toEqual([
      a.studentId,
      c.studentId,
    ]);

    // Raise the threshold so only A and B are past it (C, joined latest, isn't
    // ready). They're an exact rematch — nobody is auto-paired into a rerun.
    expect(findAutoMatchPair(activity, 98, 100_000)).toBeNull();

    // A one-directional repeat isn't an exact rerun for both, so with only A
    // and B ready it's an acceptable fallback.
    activity.lastPartners = { [b.studentId]: [a.studentId] };
    expect(findAutoMatchPair(activity, 98, 100_000)).toEqual([
      a.studentId,
      b.studentId,
    ]);
  });
});

describe("markInactive", () => {
  it('ends the chat with the default reason "teacher" when active membership drops below 2', () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;

    // No reason passed — chat:remove's and lobby:leave's call shape.
    const result = markInactive(activity, chat.id, a.studentId);
    expect(result).toEqual({ ended: true, chat });
    expect(chat.status).toBe("ended");
    expect(chat.endReason).toBe("teacher");
  });

  it('records a passed "peer-timeout" — the grace-expiry ending says so', () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;

    const result = markInactive(activity, chat.id, a.studentId, "peer-timeout");
    expect(result).toEqual({ ended: true, chat });
    expect(chat.status).toBe("ended");
    expect(chat.endReason).toBe("peer-timeout");
  });
});

describe("endChat", () => {
  it('ends an active chat with reason "teacher" and leaves every member active', () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;

    const result = endChat(activity, chat.id);
    expect(result).toEqual({ ended: true, chat });
    expect(chat.status).toBe("ended");
    expect(chat.endReason).toBe("teacher");
    // Nobody was marked inactive — settleMembershipChange reaches every
    // member through activeMembers, so all of them hear chat:ended.
    expect(chat.inactiveStudentIds).toEqual([]);
  });

  it("no-ops on an already-ended or unknown chat", () => {
    const activity = makeActivity(ROSTER);
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const chat = createChat(activity, [a.studentId, b.studentId], 10_000)!;

    expect(endChat(activity, "no-such-chat")).toBeUndefined();

    endChat(activity, chat.id);
    expect(endChat(activity, chat.id)).toBeUndefined();

    // A chat the below-2 rule already ended is just as done.
    const [c, d] = [addSeat(activity), addSeat(activity)];
    const second = createChat(activity, [c.studentId, d.studentId], 10_000)!;
    markInactive(activity, second.id, c.studentId);
    expect(second.status).toBe("ended");
    expect(endChat(activity, second.id)).toBeUndefined();
  });
});

describe("pauseChats / resumeChats", () => {
  it("resume shifts held clocks; mid-pause arrivals land at zero accrued time", () => {
    const activity = makeActivity(ROSTER);
    const waiting = addSeat(activity, { joinedAt: 10_000 });
    const [a, b] = [addSeat(activity), addSeat(activity)];
    const active = createChat(activity, [a.studentId, b.studentId], 20_000)!;
    const [c, d] = [addSeat(activity), addSeat(activity)];
    const done = createChat(activity, [c.studentId, d.studentId], 5_000)!;
    endChat(activity, done.id);

    expect(pauseChats(activity, 30_000)).toBe(true);
    expect(pauseChats(activity, 35_000)).toBe(false); // the anchor holds
    expect(activity.pausedAt).toBe(30_000);
    const midPause = addSeat(activity, { joinedAt: 40_000 });

    // A 60s pause. Whatever was accrued at the anchor stays accrued.
    expect(resumeChats(activity, 90_000)).toBe(true);
    expect(activity.pausedAt).toBeNull();
    expect(waiting.joinedAt).toBe(70_000); // 20s waited then, 20s waited now
    expect(active.startedAt).toBe(80_000); // 10s of chat time kept
    // Born mid-pause: no time accrued while the world wasn't moving.
    expect(midPause.joinedAt).toBe(90_000);
    // An ended chat's clock is never displayed — left alone.
    expect(done.startedAt).toBe(5_000);

    expect(resumeChats(activity, 95_000)).toBe(false); // not paused
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
