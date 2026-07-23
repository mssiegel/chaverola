import { CHAT_TRANSCRIPT_MAX_LINES, characterLabel } from "@chaverola/shared";

import type { StoredChat } from "../live/matching";
import type { StoredActivity } from "../store/activityStore";
import { resolveCharacter } from "../store/projections";

/*
  The transcript email's body, composed as plain text — pure, no io. The
  teacher's live cards render `(Rachel) Brutus 🔪: text` with real names
  (ConversationLines.tsx, showRealNames); this is the same format, flattened
  to text an email client can show. Names come off chat.members (captured at
  chat start), so a student who left mid-chat still resolves — their card
  label survives them, and their lines stay in place.

  Emoji ride through as UTF-8: every modern mail client renders them, and it
  keeps the email matching what the teacher saw live.
*/

/** A visual break between chat blocks — a class of 30 makes 15 of them, so
 *  the eye needs a spine. */
const DIVIDER = "──────────";

function participantLine(chat: StoredChat, activity: StoredActivity): string[] {
  return chat.members.map((member) => {
    const label = characterLabel(
      resolveCharacter(activity, member.characterId)
    );
    const left = chat.inactiveStudentIds.includes(member.studentId)
      ? " (left partway)"
      : "";
    return `${member.name} as ${label}${left}`;
  });
}

function transcriptLines(chat: StoredChat, activity: StoredActivity): string[] {
  if (chat.lines.length === 0) return ["(No messages in this chat.)"];

  const byId = new Map(
    chat.members.map((member) => [member.studentId, member])
  );
  const lines = chat.lines.map((line) => {
    const member = byId.get(line.studentId);
    // appendLine refuses a non-member, so this can't miss; the fallback keeps
    // the formatter total anyway.
    const name = member?.name ?? line.studentId;
    const label = member
      ? characterLabel(resolveCharacter(activity, member.characterId))
      : line.studentId;
    return `(${name}) ${label}: ${line.text}`;
  });

  // At the cap, the oldest lines may have been dropped (matching.ts trims
  // past CHAT_TRANSCRIPT_MAX_LINES). "May" — a chat that reached exactly the
  // cap and stopped lost nothing — so the note says what's shown, never that
  // anything was cut.
  if (chat.lines.length === CHAT_TRANSCRIPT_MAX_LINES) {
    lines.unshift(
      `(Showing the most recent ${CHAT_TRANSCRIPT_MAX_LINES} messages.)`,
      ""
    );
  }
  return lines;
}

/**
 * The subject + plain-text body of the transcript email for one activity.
 * Pure — the send-once guard and the actual send live elsewhere.
 */
export function formatTranscriptEmail(record: StoredActivity): {
  subject: string;
  text: string;
} {
  const subject = `${record.hostName}'s Chaverola activity (code ${record.joinCode})`;

  const total = record.chats.length;
  const blocks: string[] = [];

  blocks.push(
    "Here's every chat from your Chaverola activity. Each block below is one pairing, in the order they happened."
  );

  const header = [
    `Hosted by ${record.hostName}`,
    `Join code: ${record.joinCode}`,
  ];
  if (record.scenario !== undefined)
    header.push(`Scenario: ${record.scenario}`);
  blocks.push(header.join("\n"));

  record.chats.forEach((chat, index) => {
    const block = [
      DIVIDER,
      `Chat ${index + 1} of ${total}`,
      ...participantLine(chat, record),
      "",
      ...transcriptLines(chat, record),
    ];
    blocks.push(block.join("\n"));
  });

  return { subject, text: blocks.join("\n\n") + "\n" };
}
