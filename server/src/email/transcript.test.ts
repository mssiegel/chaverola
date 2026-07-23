import { describe, expect, it } from "vitest";

import {
  CHAT_TRANSCRIPT_MAX_LINES,
  DEFAULT_ACTIVITY_SETTINGS,
} from "@chaverola/shared";

import type { StoredChat, StoredChatLine } from "../live/matching";
import { createSeatState } from "../live/seats";
import type { StoredActivity } from "../store/activityStore";
import { formatTranscriptEmail } from "./transcript";

// Just the composition rules a bug would make silent — the participant line
// (including a departed member and an emoji-less character), the established
// `(name) label: text` line format, the empty-chat line, the cap note, the
// numbered heading, and the subject. The send-once guard is
// sendTranscript.test.ts; nothing here touches io.

function line(studentId: string, text: string): StoredChatLine {
  return { id: `${studentId}-${text}`, studentId, text, sentAt: 0 };
}

function chat(over: Partial<StoredChat>): StoredChat {
  return {
    id: "chat",
    members: [],
    inactiveStudentIds: [],
    lines: [],
    startedAt: 0,
    status: "ended",
    endReason: "teacher",
    endedBy: null,
    ...over,
  };
}

function record(chats: StoredChat[]): StoredActivity {
  return {
    joinCode: "5678",
    hostKey: "AAAAAAAAAAAAAAAAAAAAAAAA",
    hostName: "Ms. Cohen",
    characters: [
      { id: "brutus", name: "Brutus", emoji: "🔪" },
      { id: "caesar", name: "Caesar", emoji: "👑" },
      { id: "cicero", name: "Cicero" }, // no emoji on purpose
    ],
    scenario: "Rome, 44 BC, the night before the Ides of March.",
    teacherEmail: "cohen@example.com",
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    createdAt: 0,
    lastSeenAt: 0,
    seats: createSeatState(),
    chats,
    lastPartners: {},
    leftoverStudentId: null,
    rematchNotice: null,
    pausedAt: null,
    transcriptEmail: null,
  };
}

describe("formatTranscriptEmail", () => {
  it("names the activity in the subject — host name and join code, no date", () => {
    const { subject } = formatTranscriptEmail(record([]));
    expect(subject).toBe("Ms. Cohen's Chaverola activity (code 5678)");
  });

  it("heads the body with who hosted, the code, and the scenario", () => {
    const { text } = formatTranscriptEmail(record([]));
    expect(text).toContain("Hosted by Ms. Cohen");
    expect(text).toContain("Join code: 5678");
    expect(text).toContain(
      "Scenario: Rome, 44 BC, the night before the Ides of March."
    );
  });

  it("omits the scenario line when none was set", () => {
    const base = record([]);
    delete base.scenario;
    expect(formatTranscriptEmail(base).text).not.toContain("Scenario:");
  });

  it("renders participants and lines in the established teacher format", () => {
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [
            { studentId: "s1", name: "Rachel", characterId: "brutus" },
            { studentId: "s2", name: "Noa", characterId: "caesar" },
          ],
          lines: [line("s1", "Et tu?"), line("s2", "rude")],
        }),
      ])
    );
    // Numbered heading + participants line (realName as label).
    expect(text).toContain("Chat 1 of 1");
    expect(text).toContain("Rachel as Brutus 🔪");
    expect(text).toContain("Noa as Caesar 👑");
    // The line format: (realName) label: text — emoji rides through.
    expect(text).toContain("(Rachel) Brutus 🔪: Et tu?");
    expect(text).toContain("(Noa) Caesar 👑: rude");
  });

  it("marks a member who left mid-chat, and departed members still resolve", () => {
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [
            { studentId: "s1", name: "Rachel", characterId: "brutus" },
            { studentId: "s3", name: "Dana", characterId: "cicero" },
          ],
          inactiveStudentIds: ["s3"],
          // Dana spoke before leaving — the line survives, in place.
          lines: [line("s3", "I'm out"), line("s1", "wait")],
        }),
      ])
    );
    // Cicero has no emoji: bare name, no trailing space before the marker.
    expect(text).toContain("Dana as Cicero (left partway)");
    expect(text).toContain("Rachel as Brutus 🔪");
    expect(text).toContain("(Dana) Cicero: I'm out");
  });

  it("says so for a chat where nobody spoke", () => {
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [
            { studentId: "s1", name: "Rachel", characterId: "brutus" },
            { studentId: "s2", name: "Noa", characterId: "caesar" },
          ],
          lines: [],
        }),
      ])
    );
    expect(text).toContain("(No messages in this chat.)");
  });

  it("notes the cap on a chat sitting at the transcript limit", () => {
    const lines = Array.from({ length: CHAT_TRANSCRIPT_MAX_LINES }, (_, i) =>
      line("s1", `msg ${i}`)
    );
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [{ studentId: "s1", name: "Rachel", characterId: "brutus" }],
          lines,
        }),
      ])
    );
    expect(text).toContain(
      `(Showing the most recent ${CHAT_TRANSCRIPT_MAX_LINES} messages.)`
    );
  });

  it("numbers each chat against the total", () => {
    const twoMembers = {
      members: [
        { studentId: "s1", name: "Rachel", characterId: "brutus" },
        { studentId: "s2", name: "Noa", characterId: "caesar" },
      ],
      lines: [line("s1", "hi")],
    };
    const { text } = formatTranscriptEmail(
      record([chat(twoMembers), chat(twoMembers), chat(twoMembers)])
    );
    expect(text).toContain("Chat 1 of 3");
    expect(text).toContain("Chat 2 of 3");
    expect(text).toContain("Chat 3 of 3");
  });
});
