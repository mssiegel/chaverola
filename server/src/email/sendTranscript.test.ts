import { pino } from "pino";
import { describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";

import type { StoredChat } from "../live/matching";
import { createSeatState } from "../live/seats";
import type { StoredActivity } from "../store/activityStore";
import type { EmailMessage, Mailer } from "./mailer";
import { sendTranscriptEmail } from "./sendTranscript";

// The send-once guard, the other place a bug would be silent (a teacher
// double-billed, or a transcript silently never sent). No vi. — the fake
// mailer is a hand-written object: a call counter plus, for the race test, a
// send that parks until released. The formatter is transcript.test.ts.

const log = pino({ level: "silent" });

/** A fake mailer that counts sends. `park` holds each send open until
 *  release() is called — that's how the concurrent-claim guard gets tested. */
function fakeMailer(opts: { reject?: boolean; park?: boolean } = {}): {
  mailer: Mailer;
  count: () => number;
  sent: EmailMessage[];
  release: () => void;
} {
  const sent: EmailMessage[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    sent,
    count: () => sent.length,
    release,
    mailer: {
      mode: "log",
      async send(message) {
        sent.push(message);
        if (opts.park) await gate;
        if (opts.reject) throw new Error("smtp is down");
      },
    },
  };
}

function makeRecord(over: Partial<StoredActivity> = {}): StoredActivity {
  const chat: StoredChat = {
    id: "chat-1",
    members: [{ studentId: "s1", name: "Rachel", characterId: "brutus" }],
    inactiveStudentIds: [],
    lines: [{ id: "l1", studentId: "s1", text: "hi", sentAt: 0 }],
    startedAt: 0,
    status: "ended",
    endReason: "teacher",
    endedBy: null,
  };
  return {
    joinCode: "5678",
    hostKey: "AAAAAAAAAAAAAAAAAAAAAAAA",
    hostName: "Ms. Cohen",
    characters: [{ id: "brutus", name: "Brutus" }],
    teacherEmail: "cohen@example.com",
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    createdAt: 0,
    lastSeenAt: 0,
    seats: createSeatState(),
    chats: [chat],
    lastPartners: {},
    leftoverStudentId: null,
    rematchNotice: null,
    pausedAt: null,
    transcriptEmail: null,
    ...over,
  };
}

describe("sendTranscriptEmail", () => {
  it("sends once and reports sent", async () => {
    const record = makeRecord();
    const fake = fakeMailer();
    const result = await sendTranscriptEmail(record, fake.mailer, log);
    expect(result).toEqual({ to: "cohen@example.com", state: "sent" });
    expect(fake.count()).toBe(1);
    expect(record.transcriptEmail).toEqual({
      to: "cohen@example.com",
      state: "sent",
    });
  });

  it("a second call while the first is in flight sends nothing", async () => {
    const record = makeRecord();
    const fake = fakeMailer({ park: true });
    // First call claims the send and parks inside mailer.send.
    const first = sendTranscriptEmail(record, fake.mailer, log);
    // Second call, concurrent: it must see "sending" and bow out.
    const second = await sendTranscriptEmail(record, fake.mailer, log);
    expect(second).toBeNull();
    fake.release();
    expect(await first).toEqual({ to: "cohen@example.com", state: "sent" });
    expect(fake.count()).toBe(1);
  });

  it("a completed send is reported sent on a repeat, without resending", async () => {
    const record = makeRecord({
      transcriptEmail: { to: "cohen@example.com", state: "sent" },
    });
    const fake = fakeMailer();
    const result = await sendTranscriptEmail(record, fake.mailer, log);
    expect(result).toEqual({ to: "cohen@example.com", state: "sent" });
    expect(fake.count()).toBe(0);
  });

  it("a failed record admits exactly one retry", async () => {
    const record = makeRecord({
      transcriptEmail: { to: "cohen@example.com", state: "failed" },
    });
    const fake = fakeMailer();
    const result = await sendTranscriptEmail(record, fake.mailer, log);
    expect(result).toEqual({ to: "cohen@example.com", state: "sent" });
    expect(fake.count()).toBe(1);
    // Now it's sent — a further call resends nothing.
    const again = await sendTranscriptEmail(record, fake.mailer, log);
    expect(again).toEqual({ to: "cohen@example.com", state: "sent" });
    expect(fake.count()).toBe(1);
  });

  it("records a failure and keeps the transcript retryable", async () => {
    const record = makeRecord();
    const fake = fakeMailer({ reject: true });
    const result = await sendTranscriptEmail(record, fake.mailer, log);
    expect(result).toEqual({ to: "cohen@example.com", state: "failed" });
    expect(record.transcriptEmail?.state).toBe("failed");
  });

  it("sends nothing when no email is set", async () => {
    const record = makeRecord({ teacherEmail: undefined });
    const fake = fakeMailer();
    expect(await sendTranscriptEmail(record, fake.mailer, log)).toBeNull();
    expect(fake.count()).toBe(0);
  });

  it("sends nothing when no chat has a single message", async () => {
    const silentChat: StoredChat = {
      id: "chat-1",
      members: [{ studentId: "s1", name: "Rachel", characterId: "brutus" }],
      inactiveStudentIds: [],
      lines: [],
      startedAt: 0,
      status: "ended",
      endReason: "teacher",
      endedBy: null,
    };
    const record = makeRecord({ chats: [silentChat] });
    const fake = fakeMailer();
    expect(await sendTranscriptEmail(record, fake.mailer, log)).toBeNull();
    expect(fake.count()).toBe(0);
  });
});
