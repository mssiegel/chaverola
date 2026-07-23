import type { Logger } from "pino";

import type { StoredActivity } from "../store/activityStore";
import type { Mailer } from "./mailer";
import { formatTranscriptEmail } from "./transcript";

/*
  The send-once guard. Both triggers for a transcript send — the teacher's
  explicit End (feature 11 prompt 3) and the ~10-minute fallback after the
  last teacher socket drops (prompt 4) — go through here, and either can fire
  while the other is mid-await. The guard is safe without locks because JS is
  single-threaded: record.transcriptEmail is read and set to "sending"
  synchronously, before the first await, so a second call always sees
  "sending" and bows out. One deliberate exception: "failed" admits one more
  attempt, so an explicit End can retry after a failed fallback send.

  Returns the result the caller reports (prompt 3's activity:end-result
  payload): { to, state } after a send or an already-"sent" record, or null
  when there was nothing to send — no email set, or not a single message
  across every chat.
*/

export async function sendTranscriptEmail(
  record: StoredActivity,
  mailer: Mailer,
  log: Logger
): Promise<{ to: string; state: "sent" | "failed" } | null> {
  // State first, so a completed send is reported honestly even if the email
  // field was cleared afterward.
  const existing = record.transcriptEmail;
  if (existing?.state === "sending") return null; // a repeat is in flight
  if (existing?.state === "sent") {
    return { to: existing.to, state: "sent" };
  }

  const to = record.teacherEmail;
  if (to === undefined) return null; // the teacher opted out
  // Nothing worth sending: no chats, or chats that never saw a message. A
  // silent class reads the same as no class here (product call).
  if (record.chats.every((chat) => chat.lines.length === 0)) return null;

  // Claim the send synchronously — this is the check-and-set the race relies
  // on. (existing is null or "failed"; "failed" is the sanctioned one retry.)
  record.transcriptEmail = { to, state: "sending" };

  const { subject, text } = formatTranscriptEmail(record);
  try {
    await mailer.send({ to, subject, text });
    record.transcriptEmail = { to, state: "sent" };
    log.info(
      { joinCode: record.joinCode, chats: record.chats.length },
      "transcript email sent"
    );
    return { to, state: "sent" };
  } catch (err) {
    record.transcriptEmail = { to, state: "failed" };
    // The error, never the body — the transcript is the teacher's.
    log.error({ joinCode: record.joinCode, err }, "transcript email failed");
    return { to, state: "failed" };
  }
}
