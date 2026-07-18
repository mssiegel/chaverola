import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@/lib/activitySetup";
import type { ActivitySettings, HostedActivity } from "@/types/activity";

import {
  AUTO_MATCH_GAP_SECONDS,
  createChat,
  findAutoMatchPair,
  isExactRematchIn,
  pairEveryoneIn,
  tickWorld,
  type HostWorld,
  type WaitingStudent,
} from "./hostWorld";

function student(id: string, waitSeconds = 30): WaitingStudent {
  return { id, realName: `Student ${id.toUpperCase()}`, waitSeconds };
}

function world(overrides: Partial<HostWorld>): HostWorld {
  return {
    queue: [],
    chats: [],
    wrappingUp: [],
    lastPartners: {},
    joinPool: [],
    secondsUntilNextJoin: 99,
    secondsUntilAutoMatch: 99,
    leftoverStudentId: null,
    rematchNotice: null,
    paused: false,
    ...overrides,
  };
}

function activity(
  characterCount: 2 | 3 | 4 = 2,
  settings: Partial<ActivitySettings> = {}
): HostedActivity {
  return {
    joinCode: "4321",
    hostName: "Ms. Cohen",
    characters: [
      { id: "caesar", name: "Caesar's ghost" },
      { id: "brutus", name: "Brutus" },
      { id: "cleo", name: "Cleopatra" },
      { id: "antony", name: "Marc Antony" },
    ].slice(0, characterCount),
    // Auto-match off by default so ticks stay inert unless a test opts in.
    settings: { ...DEFAULT_ACTIVITY_SETTINGS, autoMatch: false, ...settings },
  };
}

describe("createChat", () => {
  it("seats the students, clears them from the queue, and remembers partners", () => {
    const w = createChat(
      world({
        queue: [student("a"), student("b"), student("c")],
        lastPartners: { a: ["z"] },
      }),
      ["a", "b"],
      activity()
    );
    expect(w.queue.map((s) => s.id)).toEqual(["c"]);
    expect(w.chats).toHaveLength(1);
    expect(w.chats[0]!.participants.map((p) => p.id).sort()).toEqual([
      "a",
      "b",
    ]);
    // One round deep: the new room replaces a's previous partner memory.
    expect(w.lastPartners.a).toEqual(["b"]);
    expect(w.lastPartners.b).toEqual(["a"]);
  });

  it("starts the auto-end clock only when the setting is on", () => {
    const queue = [student("a"), student("b")];
    const on = createChat(world({ queue }), ["a", "b"], activity());
    expect(on.chats[0]!.autoEndSecondsLeft).toBe(
      DEFAULT_ACTIVITY_SETTINGS.autoEndMinutes * 60
    );
    const off = createChat(
      world({ queue }),
      ["a", "b"],
      activity(2, { autoEndChats: false })
    );
    expect(off.chats[0]!.autoEndSecondsLeft).toBeNull();
  });

  it("does nothing for fewer than two seatable students", () => {
    const w = world({ queue: [student("a")] });
    expect(createChat(w, ["a"], activity())).toBe(w);
  });
});

describe("isExactRematchIn", () => {
  it("is true only when every member's previous chat was exactly this group", () => {
    expect(isExactRematchIn({ a: ["b"], b: ["a"] }, ["a", "b"])).toBe(true);
    expect(
      isExactRematchIn({ a: ["b", "c"], b: ["a", "c"], c: ["a", "b"] }, [
        "a",
        "b",
        "c",
      ])
    ).toBe(true);
  });

  it("stays false when one member has moved on — Bob chats Rachel, then Shlomo", () => {
    // Rachel's previous chat was exactly Bob, but Bob's wasn't Rachel.
    expect(
      isExactRematchIn({ bob: ["shlomo"], rachel: ["bob"] }, ["bob", "rachel"])
    ).toBe(false);
  });

  it("does not count a pair carved out of a previous group", () => {
    expect(isExactRematchIn({ a: ["b", "c"], b: ["a", "c"] }, ["a", "b"])).toBe(
      false
    );
  });

  it("is false for a swapped group member, a missing memory, or a single id", () => {
    expect(
      isExactRematchIn({ a: ["b", "c"], b: ["a", "c"], d: ["x", "y"] }, [
        "a",
        "b",
        "d",
      ])
    ).toBe(false);
    expect(isExactRematchIn({ a: ["b"] }, ["a", "b"])).toBe(false);
    expect(isExactRematchIn({ a: ["b"] }, ["a"])).toBe(false);
  });
});

describe("findAutoMatchPair", () => {
  it("prefers fresh partners and skips students who have not waited long enough", () => {
    const pair = findAutoMatchPair(
      [student("a", 30), student("b", 30), student("c", 30)],
      20,
      { a: ["b"], b: ["a"] }
    );
    expect(pair!.map((s) => s.id)).toEqual(["a", "c"]);

    expect(
      findAutoMatchPair([student("a", 30), student("b", 5)], 20, {})
    ).toBeNull();
  });

  it("prefers a fully fresh pair even over a one-directional repeat", () => {
    const pair = findAutoMatchPair(
      [student("a", 30), student("b", 30), student("c", 30)],
      20,
      { b: ["a"] }
    );
    expect(pair!.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("falls back to a repeat as long as it is not an exact rerun", () => {
    // Bob's previous chat was Shlomo, so Bob+Rachel is not a rerun for him.
    const pair = findAutoMatchPair(
      [student("bob", 30), student("rachel", 30)],
      20,
      { bob: ["shlomo"], rachel: ["bob"] }
    );
    expect(pair!.map((s) => s.id)).toEqual(["bob", "rachel"]);
  });

  it("never re-pairs an exact rematch", () => {
    expect(
      findAutoMatchPair([student("a", 30), student("b", 30)], 20, {
        a: ["b"],
        b: ["a"],
      })
    ).toBeNull();
  });
});

describe("pairEveryoneIn", () => {
  it("pairs an even queue with no notice", () => {
    const w = pairEveryoneIn(
      world({ queue: ["a", "b", "c", "d"].map((id) => student(id)) }),
      activity()
    );
    expect(w.chats).toHaveLength(2);
    expect(w.queue).toHaveLength(0);
    expect(w.rematchNotice).toBeNull();
    expect(w.leftoverStudentId).toBeNull();
  });

  it("leaves the newest joiner first in line when the roster is two characters", () => {
    const w = pairEveryoneIn(
      world({ queue: ["a", "b", "c"].map((id) => student(id)) }),
      activity(2)
    );
    expect(w.chats).toHaveLength(1);
    expect(w.leftoverStudentId).toBe("c");
    expect(w.queue.map((s) => s.id)).toEqual(["c"]);
  });

  it("seats the last three as a group when a 3rd character exists", () => {
    const w = pairEveryoneIn(
      world({ queue: ["a", "b", "c"].map((id) => student(id)) }),
      activity(3)
    );
    expect(w.chats).toHaveLength(1);
    expect(w.chats[0]!.participants).toHaveLength(3);
    expect(w.leftoverStudentId).toBeNull();
  });

  it("leaves an exact-rematch pair in line instead of re-pairing them", () => {
    const queue = [student("a"), student("b")];
    const lastPartners = { a: ["b"], b: ["a"] };
    const w = pairEveryoneIn(world({ queue, lastPartners }), activity());
    expect(w.chats).toHaveLength(0);
    expect(w.queue.map((s) => s.id)).toEqual(["a", "b"]);
    expect(w.rematchNotice).toContain("Student A and Student B");

    // The notice explains why the button left them in line, so unlike the
    // heads-up it shows even with the rematch warning setting off.
    const settingOff = pairEveryoneIn(
      world({ queue, lastPartners }),
      activity(2, { rematchWarning: false })
    );
    expect(settingOff.chats).toHaveLength(0);
    expect(settingOff.rematchNotice).toContain("Student A and Student B");
  });

  it("pairs a partial repeat silently — it is not an exact rerun", () => {
    const w = pairEveryoneIn(
      world({
        queue: [student("a"), student("b")],
        lastPartners: { b: ["a"] },
      }),
      activity()
    );
    expect(w.chats).toHaveLength(1);
    expect(w.rematchNotice).toBeNull();
  });

  it("repairs a stranded exact pair by swapping with an earlier pairing", () => {
    const w = pairEveryoneIn(
      world({
        queue: ["a", "b", "c", "d"].map((id) => student(id)),
        lastPartners: { c: ["d"], d: ["c"] },
      }),
      activity()
    );
    expect(w.chats).toHaveLength(2);
    expect(w.queue).toHaveLength(0);
    expect(w.rematchNotice).toBeNull();
    for (const chat of w.chats) {
      expect(chat.participants.map((p) => p.id).sort()).not.toEqual(["c", "d"]);
    }
  });

  it("repairs a stranded exact pair through the leftover when that is all there is", () => {
    const w = pairEveryoneIn(
      world({
        queue: ["a", "b", "c"].map((id) => student(id)),
        lastPartners: { a: ["b"], b: ["a"] },
      }),
      activity(2)
    );
    expect(w.chats).toHaveLength(1);
    expect(w.chats[0]!.participants.map((p) => p.id).sort()).toEqual([
      "a",
      "c",
    ]);
    expect(w.queue.map((s) => s.id)).toEqual(["b"]);
    expect(w.leftoverStudentId).toBe("b");
    expect(w.rematchNotice).toBeNull();
  });

  it("repairs an exact-rematch trio by trading a member with a pair", () => {
    const w = pairEveryoneIn(
      world({
        queue: ["a", "b", "c", "d", "e"].map((id) => student(id)),
        lastPartners: { c: ["d", "e"], d: ["c", "e"], e: ["c", "d"] },
      }),
      activity(3)
    );
    expect(w.chats).toHaveLength(2);
    expect(w.queue).toHaveLength(0);
    expect(w.rematchNotice).toBeNull();
    const sizes = w.chats.map((c) => c.participants.length).sort();
    expect(sizes).toEqual([2, 3]);
    const trioChat = w.chats.find((c) => c.participants.length === 3)!;
    expect(trioChat.participants.map((p) => p.id).sort()).not.toEqual([
      "c",
      "d",
      "e",
    ]);
  });

  it("leaves an exact-rematch trio in line when the queue is only them", () => {
    const w = pairEveryoneIn(
      world({
        queue: ["c", "d", "e"].map((id) => student(id)),
        lastPartners: { c: ["d", "e"], d: ["c", "e"], e: ["c", "d"] },
      }),
      activity(3)
    );
    expect(w.chats).toHaveLength(0);
    expect(w.queue).toHaveLength(3);
    expect(w.rematchNotice).toContain("Student C, Student D, and Student E");
  });
});

describe("tickWorld", () => {
  it("advances wait times and ends a chat whose clock hits zero with reason timer", () => {
    const seeded = createChat(
      world({ queue: [student("a", 10), student("b", 10), student("c", 10)] }),
      ["a", "b"],
      activity()
    );
    seeded.chats[0]!.autoEndSecondsLeft = 1;

    const ticked = tickWorld(seeded, activity());
    expect(ticked.queue.map((s) => s.waitSeconds)).toEqual([11]);
    expect(ticked.chats[0]!.status).toBe("ended");
    expect(ticked.chats[0]!.endReason).toBe("timer");
    // The ended chat's students wrap up before rejoining the queue.
    expect(ticked.wrappingUp.map((e) => e.student.id).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("auto-matches a waiting pair once the gap counts down", () => {
    const w = world({
      queue: [student("a", 30), student("b", 30)],
      secondsUntilAutoMatch: 1,
    });
    const ticked = tickWorld(w, activity(2, { autoMatch: true }));
    expect(ticked.chats).toHaveLength(1);
    expect(ticked.queue).toHaveLength(0);
    expect(ticked.secondsUntilAutoMatch).toBe(AUTO_MATCH_GAP_SECONDS);
  });
});

describe("tickWorld while paused", () => {
  it("holds wait times, chat clocks, and the auto-match countdown, and pairs nobody", () => {
    const seeded = createChat(
      world({
        queue: ["a", "b", "c", "d"].map((id) => student(id, 30)),
        secondsUntilAutoMatch: 0,
      }),
      ["a", "b"],
      activity(2, { autoMatch: true })
    );
    const clockBefore = seeded.chats[0]!.autoEndSecondsLeft;
    const paused = { ...seeded, paused: true };

    const ticked = tickWorld(paused, activity(2, { autoMatch: true }));
    expect(ticked.queue.map((s) => s.waitSeconds)).toEqual([30, 30]);
    expect(ticked.chats[0]!.autoEndSecondsLeft).toBe(clockBefore);
    expect(ticked.secondsUntilAutoMatch).toBe(0);
    // Both leftovers are past the threshold, yet no pair forms.
    expect(ticked.chats).toHaveLength(1);
  });

  it("never expires a clock mid-pause, even at 1 second left", () => {
    const seeded = createChat(
      world({ queue: [student("a"), student("b")] }),
      ["a", "b"],
      activity()
    );
    seeded.chats[0]!.autoEndSecondsLeft = 1;
    let w = { ...seeded, paused: true };
    for (let i = 0; i < 5; i++) w = tickWorld(w, activity());
    expect(w.chats[0]!.status).toBe("active");
    expect(w.chats[0]!.autoEndSecondsLeft).toBe(1);
  });

  it("keeps joins dripping and wrapping-up students returning", () => {
    const w = world({
      paused: true,
      joinPool: [{ id: "j", realName: "Joiner" }],
      secondsUntilNextJoin: 1,
      wrappingUp: [
        { student: { id: "r", realName: "Returner" }, secondsUntilReturn: 1 },
      ],
    });
    const ticked = tickWorld(w, activity());
    expect(ticked.queue.map((s) => s.id).sort()).toEqual(["j", "r"]);
    expect(ticked.joinPool).toHaveLength(0);
    expect(ticked.wrappingUp).toHaveLength(0);
  });

  it("still creates chats — born with a full, frozen clock", () => {
    const w = createChat(
      world({ paused: true, queue: [student("a"), student("b")] }),
      ["a", "b"],
      activity()
    );
    expect(w.chats).toHaveLength(1);
    expect(w.paused).toBe(true);
    expect(w.chats[0]!.autoEndSecondsLeft).toBe(
      DEFAULT_ACTIVITY_SETTINGS.autoEndMinutes * 60
    );
  });
});
