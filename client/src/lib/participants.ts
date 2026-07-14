import type { Participant } from "@/types/chat";

/** Index a room's participants by id for message-line lookups. */
export function participantsById(
  participants: Participant[]
): Map<string, Participant> {
  const byId = new Map<string, Participant>();
  for (const p of participants) byId.set(p.id, p);
  return byId;
}
