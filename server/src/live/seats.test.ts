import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";
import type { StudentAuth } from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import { createSeatState, reapSeat, returnToQueue, seatStudent } from "./seats";
import type { Seat } from "./seats";

/*
  Deliberately light, like matching.test.ts: only the reap memory's pure
  rules (feature 9) — what a reap remembers, what a remembered token gets
  back, and the precedence pins that keep the resume chain honest. The
  broader seat lifecycle (resume, eviction, timers, the cap) is covered by
  lobby.test.ts and the features' browser passes.
*/

function makeActivity(): StoredActivity {
  return {
    joinCode: "5678",
    hostKey: "AAAAAAAAAAAAAAAAAAAAAAAA",
    hostName: "Ms. Cohen",
    characters: [{ id: "brutus", name: "Brutus" }],
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    createdAt: 0,
    lastSeenAt: 0,
    seats: createSeatState(),
    chats: [],
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
    joinedAt: seatCounter * 1_000,
    connected: true,
    currentSocketId: `socket-${seatCounter}`,
    wrappingUp: false,
    timers: {},
    ...overrides,
  };
  activity.seats.byId.set(seat.studentId, seat);
  if (seat.nonce !== undefined) {
    activity.seats.byNonce.set(seat.nonce, seat.studentId);
  }
  return seat;
}

const auth = (fields: Partial<StudentAuth>): StudentAuth => ({
  role: "student",
  joinCode: "5678",
  ...fields,
});

describe("reapSeat", () => {
  it("remembers a chat seat's reap and forgets a waiting seat's", () => {
    const activity = makeActivity();
    const inChat = addSeat(activity, { nonce: "nonce-chat" });
    const waiting = addSeat(activity);

    reapSeat(activity, inChat, "chat-1");
    reapSeat(activity, waiting);

    expect(activity.seats.reapedFromChatByToken.get(inChat.token)).toEqual({
      chatId: "chat-1",
      studentId: inChat.studentId,
    });
    expect(activity.seats.reapedFromChatByToken.has(waiting.token)).toBe(false);
    // Both seats are gone either way — the memory outlives the seat.
    expect(activity.seats.byId.size).toBe(0);
    expect(activity.seats.byNonce.has("nonce-chat")).toBe(false);
  });
});

describe("seatStudent with a remembered token", () => {
  it("mints a fresh wrappingUp seat with the ended chat stamped on", () => {
    const activity = makeActivity();
    const reaped = addSeat(activity);
    reapSeat(activity, reaped, "chat-1");

    const result = seatStudent(
      activity,
      auth({
        name: "Rachel",
        nonce: "nonce-return",
        studentId: reaped.studentId,
        token: reaped.token,
      }),
      "socket-return",
      5_000
    );

    expect(result.kind).toBe("seated");
    if (result.kind !== "seated" && result.kind !== "resumed") return;
    // A fresh identity — the old one belongs to the chat record now.
    expect(result.seat.studentId).not.toBe(reaped.studentId);
    expect(result.seat.token).not.toBe(reaped.token);
    expect(result.seat.wrappingUp).toBe(true);
    expect(result.seat.reapedFromChat).toEqual({
      chatId: "chat-1",
      studentId: reaped.studentId,
    });
    // The nonce binds to the NEW seat, so an immediate re-join (before the
    // new welcome persisted) resumes it instead of duplicating.
    expect(activity.seats.byNonce.get("nonce-return")).toBe(
      result.seat.studentId
    );
  });

  it("keeps the tombstone's precedence and the nonce resume's", () => {
    const activity = makeActivity();

    // Tombstone beats memory: a removed-then-reaped token stays "removed".
    const removed = addSeat(activity);
    activity.seats.tombstonedTokens.add(removed.token);
    activity.seats.reapedFromChatByToken.set(removed.token, {
      chatId: "chat-1",
      studentId: removed.studentId,
    });
    expect(
      seatStudent(
        activity,
        auth({ name: "Rachel", token: removed.token }),
        "socket-a",
        5_000
      )
    ).toEqual({ kind: "rejected", code: "removed" });

    // A live seat's nonce beats a remembered stale token: the returner who
    // reconnects before the new welcome persisted presents the OLD token
    // and the nonce — the nonce must resume the new seat, never mint a
    // duplicate.
    const reaped = addSeat(activity);
    reapSeat(activity, reaped, "chat-2");
    const returned = seatStudent(
      activity,
      auth({
        name: "Rachel",
        nonce: "nonce-r",
        studentId: reaped.studentId,
        token: reaped.token,
      }),
      "socket-b",
      6_000
    );
    if (returned.kind === "rejected") throw new Error("unexpected rejection");
    const again = seatStudent(
      activity,
      auth({
        name: "Rachel",
        nonce: "nonce-r",
        studentId: reaped.studentId,
        token: reaped.token,
      }),
      "socket-c",
      7_000
    );
    expect(again.kind).toBe("resumed");
    if (again.kind === "rejected") return;
    expect(again.seat.studentId).toBe(returned.seat.studentId);
    expect(again.seat.reapedFromChat).toEqual({
      chatId: "chat-2",
      studentId: reaped.studentId,
    });
  });
});

describe("returnToQueue", () => {
  it("clears the replay context with the wrap-up", () => {
    const activity = makeActivity();
    const seat = addSeat(activity, {
      wrappingUp: true,
      reapedFromChat: { chatId: "chat-1", studentId: "old-id" },
    });

    returnToQueue(seat, 9_000);

    expect(seat.wrappingUp).toBe(false);
    expect(seat.reapedFromChat).toBeUndefined();
    expect(seat.joinedAt).toBe(9_000);
  });
});
