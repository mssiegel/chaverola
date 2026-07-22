import {
  LOBBY_GRACE_SECONDS,
  type Character,
  type ChatLine,
  type ChatPeer,
} from "@chaverola/shared";

import { characterLabel } from "@/lib/characterLabel";
import { nextId } from "@/lib/random";
import { NOTICE_SENDER_ID } from "@/types/chat";
import type { ChatMessage, Participant } from "@/types/chat";

import {
  FALLBACK_CHARACTER_NAME,
  type ActiveMatch,
  type LiveMatch,
} from "./stageTypes";

/*
  The live-match state machine as pure reducers — no React, no refs, no
  timers. Each `apply*` takes the previous match (the `setMatch` prev) and a
  wire payload and returns the next match; the hook that owns `match`
  (useActiveMatch) wires them as one-liners and owns the timers and refs the
  spec keeps beside them. Roster resolution takes the fetched characters as a
  parameter instead of closing over the page's activity — the only reason
  these weren't already pure.
*/

/** chat:started's payload, as the presence hook hands it over. */
export type ChatStartedPayload = {
  chatId: string;
  selfCharacterId: string;
  peers: ChatPeer[];
  everPeers: ChatPeer[];
  lines: ChatLine[];
  /** Optional for the deploy window where an older server sends no backlog. */
  reconnectingPeers?: { characterId: string; secondsLeft: number }[];
};

export type ChatLinePayload = { chatId: string; line: ChatLine };
export type ChatUpdatePayload = { chatId: string; peers: ChatPeer[] };
export type PeerTypingPayload = { chatId: string; characterId: string };
export type PeerConnectionPayload = {
  chatId: string;
  characterId: string;
  state: "dropped" | "returned";
  secondsLeft: number | null;
};

/** A wire line as a renderable message. The sender IS the characterId —
 *  participant ids in a live room are characterIds. No timestamp: the
 *  server's array order is the order, and merges preserve it. */
export function toLiveMessage(line: ChatLine): ChatMessage {
  return { id: line.id, senderId: line.characterId, text: line.text };
}

/** chat:started's offline backlog as the match's offline map: wire seconds
 *  → epoch-ms deadlines (the same derivation the live "dropped" handler
 *  uses). `?? []` tolerates the deploy window where an older server sends
 *  no backlog — absence reads as nobody offline, today's behavior. */
export function toOfflinePeers(
  reconnectingPeers: { characterId: string; secondsLeft: number }[] | undefined
): Record<string, number> {
  const now = Date.now();
  const offlinePeers: Record<string, number> = {};
  for (const peer of reconnectingPeers ?? []) {
    offlinePeers[peer.characterId] = now + peer.secondsLeft * 1000;
  }
  return offlinePeers;
}

/** Resolve a wire characterId against the fetched roster. Can't miss in
 *  practice (the server deals from the roster the student fetched), but
 *  the wire is the wire — an unresolvable id still renders, as a mystery. */
export function resolveCharacter(
  roster: Character[],
  characterId: string
): Character {
  return (
    roster.find((c) => c.id === characterId) ?? {
      id: characterId,
      name: FALLBACK_CHARACTER_NAME,
    }
  );
}

/** A wire peer as a room participant. Peers carry no real names by
 *  construction — the student wire never has them. */
export function toParticipant(
  roster: Character[],
  peer: ChatPeer
): Participant {
  return {
    // characterId doubles as the participant id — unique within a chat
    // (each character is dealt once), and the only identity the student
    // wire carries.
    id: peer.characterId,
    character: resolveCharacter(roster, peer.characterId),
    realName: "",
  };
}

/**
 * Reconcile a live match with the wire's current peer list: whoever
 * disappeared gets a local notice and drops out of `peers`; `everPeers`
 * keeps them so colors and lines stay stable. The notice copy is a
 * client heuristic — no reason rides the wire (see DECISIONS.md): a peer
 * who vanished while marked offline never came back, so they get the
 * timeout copy; everyone else "left the chat".
 */
export function shrinkToPeers(prev: LiveMatch, current: ChatPeer[]): LiveMatch {
  const currentIds = new Set(current.map((p) => p.characterId));
  const gone = prev.peers.filter((p) => !currentIds.has(p.id));
  if (gone.length === 0) return prev;
  // A leaver's countdown (and a just-left peer's 🎉 flash) dies with
  // their membership — the banner must never outlive the roster.
  const offlinePeers = { ...prev.offlinePeers };
  for (const peer of gone) delete offlinePeers[peer.id];
  return {
    ...prev,
    peers: prev.peers.filter((p) => currentIds.has(p.id)),
    offlinePeers,
    returnedFlashId:
      prev.returnedFlashId !== null && !currentIds.has(prev.returnedFlashId)
        ? null
        : prev.returnedFlashId,
    // A typist who left clears with their own departure notice.
    typingPeerId:
      prev.typingPeerId !== null && !currentIds.has(prev.typingPeerId)
        ? null
        : prev.typingPeerId,
    messages: [
      ...prev.messages,
      ...gone.map((peer): ChatMessage => ({
        id: nextId("m"),
        senderId: NOTICE_SENDER_ID,
        kind: "notice",
        // Checked against PREV's offline map — the strip above already
        // cleared this peer. Accepted imprecision: a teacher removing an
        // already-dropped student mid-window reads as the timeout too —
        // from inside the room, the peer was gone and never came back.
        text:
          prev.offlinePeers[peer.id] !== undefined
            ? `${characterLabel(peer)} couldn't get back in and left the chat`
            : `${characterLabel(peer)} left the chat`,
      })),
    ],
  };
}

/**
 * chat:started — both the initial match and every resume into it. A re-send
 * for a chat already in memory merges the missed transcript backlog, then
 * reconciles peers instead of resetting, then rebuilds the offline map from
 * the payload's reconnectingPeers backlog. A first delivery builds the match
 * from scratch.
 */
export function applyChatStarted(
  prev: ActiveMatch | null,
  payload: ChatStartedPayload,
  roster: Character[],
  selfName: string
): LiveMatch {
  if (prev?.kind === "live" && prev.chatId === payload.chatId) {
    // A resume re-delivery of the chat already on screen — and the
    // ONLY channel that heals a blip: the chat:line fan-out skips
    // disconnected seats, so whatever was said while this phone was
    // locked exists nowhere but this backlog. Merge missed lines (by
    // id — our own echoed sends must not double) BEFORE reconciling
    // membership, so a "left the chat" notice discovered on the same
    // resume lands after the lines it follows: the true order.
    const known = new Set(prev.messages.map((m) => m.id));
    const missed = payload.lines
      .filter((line) => !known.has(line.id))
      .map(toLiveMessage);
    // The spread keeps prev.typingPeerId on purpose: the TTL covers
    // staleness, and after a real refresh `prev` is gone anyway, so
    // the indicator is simply absent until the next heartbeat ≤2s
    // later — typing is not in the backlog, by design.
    const caughtUp: LiveMatch = {
      ...prev,
      everPeers: payload.everPeers.map((p) => toParticipant(roster, p)),
      messages:
        missed.length > 0 ? [...prev.messages, ...missed] : prev.messages,
    };
    // Membership reconciles against the OLD offline map on purpose:
    // a peer who timed out while this phone was dark still earns the
    // honest "couldn't get back in" notice from local memory. Only
    // THEN is the map overwritten wholesale from the payload — our
    // own blip may have swallowed a peer's drop OR return, so the
    // carried-over entries can't be trusted, and the backlog is
    // authoritative on every delivery, same philosophy as `lines`.
    const shrunk = shrinkToPeers(caughtUp, payload.peers);
    const offlinePeers = toOfflinePeers(payload.reconnectingPeers);
    return {
      ...shrunk,
      offlinePeers,
      // A peer the backlog marks offline types nothing — the same
      // rule as the live "dropped" handler.
      typingPeerId:
        shrunk.typingPeerId !== null &&
        offlinePeers[shrunk.typingPeerId] !== undefined
          ? null
          : shrunk.typingPeerId,
    };
  }
  return {
    kind: "live",
    chatId: payload.chatId,
    self: {
      id: payload.selfCharacterId,
      character: resolveCharacter(roster, payload.selfCharacterId),
      realName: selfName,
    },
    peers: payload.peers.map((p) => toParticipant(roster, p)),
    everPeers: payload.everPeers.map((p) => toParticipant(roster, p)),
    // The server's order is already correct and already capped.
    messages: payload.lines.map(toLiveMessage),
    typingPeerId: null,
    // Fresh in memory ≠ fresh in the world: a mid-chat refresh lands
    // here too, and a partner may already be mid-drop — the backlog
    // is the only place this client can learn that.
    offlinePeers: toOfflinePeers(payload.reconnectingPeers),
    returnedFlashId: null,
  };
}

/** chat:line — an incoming message (the student's own send echoes here too). */
export function applyChatLine(
  prev: ActiveMatch | null,
  payload: ChatLinePayload
): ActiveMatch | null {
  if (prev?.kind !== "live" || prev.chatId !== payload.chatId) {
    return prev;
  }
  // A live line can race a resume backlog that already carried it —
  // the id dedupe makes the replay harmless.
  if (prev.messages.some((m) => m.id === payload.line.id)) return prev;
  return {
    ...prev,
    // The peer's message landing clears THEIR bubble, instantly —
    // never another typist's. The pending TTL timer stays armed: a
    // late fire can only re-null a null.
    typingPeerId:
      payload.line.characterId === prev.typingPeerId ? null : prev.typingPeerId,
    messages: [...prev.messages, toLiveMessage(payload.line)],
  };
}

/** chat:update — a membership change; whoever left gets a local notice. */
export function applyChatUpdate(
  prev: ActiveMatch | null,
  payload: ChatUpdatePayload
): ActiveMatch | null {
  return prev?.kind === "live" && prev.chatId === payload.chatId
    ? shrinkToPeers(prev, payload.peers)
    : prev;
}

/** chat:peer-typing — the set half; the hook owns the TTL that clears it. */
export function applyPeerTyping(
  prev: ActiveMatch | null,
  payload: PeerTypingPayload
): ActiveMatch | null {
  // Skip the object churn when the slot already shows this character.
  return prev?.kind === "live" &&
    prev.chatId === payload.chatId &&
    prev.typingPeerId !== payload.characterId
    ? { ...prev, typingPeerId: payload.characterId }
    : prev;
}

/** The typing TTL's clear: a late fire can only re-null a null. */
export function clearTypingPeer(prev: ActiveMatch | null): ActiveMatch | null {
  return prev?.kind === "live" && prev.typingPeerId !== null
    ? { ...prev, typingPeerId: null }
    : prev;
}

/** chat:peer-connection "dropped" — past the server's 4s gate, with the
 *  remaining grace as an epoch-ms deadline. */
export function applyPeerDropped(
  prev: ActiveMatch | null,
  payload: PeerConnectionPayload
): ActiveMatch | null {
  if (
    prev?.kind !== "live" ||
    prev.chatId !== payload.chatId ||
    !prev.peers.some((p) => p.id === payload.characterId)
  ) {
    return prev;
  }
  return {
    ...prev,
    offlinePeers: {
      ...prev.offlinePeers,
      [payload.characterId]:
        Date.now() + (payload.secondsLeft ?? LOBBY_GRACE_SECONDS) * 1000,
    },
    // A dropped peer types nothing — their bubble dies with the
    // drop (the TTL timer's late fire can only re-null a null).
    typingPeerId:
      prev.typingPeerId === payload.characterId ? null : prev.typingPeerId,
  };
}

/** chat:peer-connection "returned" — EVERY resume announces itself (the
 *  server can't know whether the drop was ever broadcast), so this guard is
 *  what keeps sub-4s blips, duplicate-tab takeovers, and StrictMode
 *  double-mounts invisible: no offline entry, no flash, no state change. */
export function applyPeerReturned(
  prev: ActiveMatch | null,
  payload: PeerConnectionPayload
): ActiveMatch | null {
  if (
    prev?.kind !== "live" ||
    prev.chatId !== payload.chatId ||
    prev.offlinePeers[payload.characterId] === undefined
  ) {
    return prev;
  }
  const offlinePeers = { ...prev.offlinePeers };
  delete offlinePeers[payload.characterId];
  return {
    ...prev,
    offlinePeers,
    returnedFlashId: payload.characterId,
  };
}

/** The 🎉 flash's clear: a stray post-unmount fire is a guarded no-op. */
export function clearReturnedFlash(
  prev: ActiveMatch | null
): ActiveMatch | null {
  return prev?.kind === "live" && prev.returnedFlashId !== null
    ? { ...prev, returnedFlashId: null }
    : prev;
}

/** chat:ended's name reveal — the OTHER members' real names, present only
 *  when the teacher's reveal setting was on at end time. Keyed by characterId
 *  (a live participant's id IS their characterId). */
export type RevealEntry = { characterId: string; name: string };

/** Stamp the revealed real names onto the room. Both `peers` and `everPeers`,
 *  so the ended screen — which reveals `everPeers` — shows every partner,
 *  including one who dropped earlier (their name was captured at chat start).
 *  A characterId with no match is left a mystery rather than crashing; a
 *  non-live match is a no-op. */
export function applyReveal(
  prev: ActiveMatch | null,
  reveal: RevealEntry[]
): ActiveMatch | null {
  if (prev?.kind !== "live") return prev;
  const names = new Map(reveal.map((entry) => [entry.characterId, entry.name]));
  const stamp = (p: Participant): Participant =>
    names.has(p.id) ? { ...p, realName: names.get(p.id)! } : p;
  return {
    ...prev,
    peers: prev.peers.map(stamp),
    everPeers: prev.everPeers.map(stamp),
  };
}
