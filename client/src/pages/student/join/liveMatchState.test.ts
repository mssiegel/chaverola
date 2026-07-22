import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOBBY_GRACE_SECONDS, type Character } from "@chaverola/shared";

import { NOTICE_SENDER_ID, type Participant } from "@/types/chat";

import type { LiveMatch } from "./stageTypes";
import {
  applyChatLine,
  applyChatStarted,
  applyChatUpdate,
  applyPeerDropped,
  applyPeerReturned,
  resolveCharacter,
  shrinkToPeers,
  toLiveMessage,
  toOfflinePeers,
  toParticipant,
} from "./liveMatchState";

// A fixed clock so every epoch-ms deadline is exact. The reducers read
// Date.now() internally exactly as they do in the page (transcribed, not
// parameterized), so the fake timer is the seam.
const NOW = Date.UTC(2026, 6, 22, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const roster: Character[] = [
  { id: "brutus", name: "Brutus", emoji: "🔪" },
  { id: "cleo", name: "Cleopatra", emoji: "👑" },
  // No emoji on purpose — the name-only label path.
  { id: "antony", name: "Marc Antony" },
];

function participant(id: string): Participant {
  return toParticipant(roster, { characterId: id });
}

function liveMatch(overrides: Partial<LiveMatch> = {}): LiveMatch {
  return {
    kind: "live",
    chatId: "chat-1",
    self: {
      id: "antony",
      character: resolveCharacter(roster, "antony"),
      realName: "Rachel",
    },
    peers: [participant("brutus"), participant("cleo")],
    everPeers: [participant("brutus"), participant("cleo")],
    messages: [{ id: "l1", senderId: "brutus", text: "hi" }],
    typingPeerId: null,
    offlinePeers: {},
    returnedFlashId: null,
    ...overrides,
  };
}

const line = (id: string, characterId: string, text: string) => ({
  id,
  characterId,
  text,
  sentAt: 0,
});

describe("toLiveMessage", () => {
  it("maps a wire line to a message keyed by characterId, no timestamp", () => {
    expect(toLiveMessage(line("l7", "brutus", "et tu?"))).toEqual({
      id: "l7",
      senderId: "brutus",
      text: "et tu?",
    });
  });
});

describe("resolveCharacter", () => {
  it("finds a character in the roster", () => {
    expect(resolveCharacter(roster, "cleo")).toEqual({
      id: "cleo",
      name: "Cleopatra",
      emoji: "👑",
    });
  });

  it("falls back to a mystery guest for an id the roster can't resolve", () => {
    expect(resolveCharacter(roster, "ghost")).toEqual({
      id: "ghost",
      name: "Mystery guest",
    });
  });

  it("resolves against an empty roster as a mystery guest", () => {
    expect(resolveCharacter([], "brutus")).toEqual({
      id: "brutus",
      name: "Mystery guest",
    });
  });
});

describe("toParticipant", () => {
  it("uses the characterId as the participant id and carries no real name", () => {
    expect(toParticipant(roster, { characterId: "brutus" })).toEqual({
      id: "brutus",
      character: { id: "brutus", name: "Brutus", emoji: "🔪" },
      realName: "",
    });
  });
});

describe("toOfflinePeers", () => {
  it("treats an absent backlog as nobody offline", () => {
    expect(toOfflinePeers(undefined)).toEqual({});
  });

  it("turns wire seconds into epoch-ms deadlines off the current clock", () => {
    expect(
      toOfflinePeers([
        { characterId: "brutus", secondsLeft: 30 },
        { characterId: "cleo", secondsLeft: 120 },
      ])
    ).toEqual({
      brutus: NOW + 30_000,
      cleo: NOW + 120_000,
    });
  });
});

describe("applyChatStarted — first delivery", () => {
  it("builds the live match from the wire and the session name", () => {
    const next = applyChatStarted(
      null,
      {
        chatId: "chat-9",
        selfCharacterId: "antony",
        peers: [{ characterId: "brutus" }],
        everPeers: [{ characterId: "brutus" }],
        lines: [line("l1", "brutus", "hi")],
        reconnectingPeers: [{ characterId: "brutus", secondsLeft: 60 }],
      },
      roster,
      "Rachel"
    );
    expect(next).toEqual({
      kind: "live",
      chatId: "chat-9",
      self: {
        id: "antony",
        character: { id: "antony", name: "Marc Antony" },
        realName: "Rachel",
      },
      peers: [participant("brutus")],
      everPeers: [participant("brutus")],
      messages: [{ id: "l1", senderId: "brutus", text: "hi" }],
      typingPeerId: null,
      offlinePeers: { brutus: NOW + 60_000 },
      returnedFlashId: null,
    });
  });
});

describe("applyChatStarted — resume re-delivery", () => {
  it("merges only missed lines, keeping known ids from doubling", () => {
    const prev = liveMatch({
      messages: [
        { id: "l1", senderId: "brutus", text: "hi" },
        { id: "l2", senderId: "antony", text: "hey" },
      ],
    });
    const next = applyChatStarted(
      prev,
      {
        chatId: "chat-1",
        selfCharacterId: "antony",
        peers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        everPeers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        // l1 already known; l3 is the line missed while dark.
        lines: [line("l1", "brutus", "hi"), line("l3", "cleo", "back?")],
      },
      roster,
      "Rachel"
    ) as LiveMatch;
    expect(next.messages).toEqual([
      { id: "l1", senderId: "brutus", text: "hi" },
      { id: "l2", senderId: "antony", text: "hey" },
      { id: "l3", senderId: "cleo", text: "back?" },
    ]);
  });

  it("names a peer who timed out while dark via the OLD offline map, and lands the notice after the missed lines", () => {
    const prev = liveMatch({
      // cleo was offline in local memory when this phone went dark.
      offlinePeers: { cleo: NOW - 5_000 },
    });
    const next = applyChatStarted(
      prev,
      {
        chatId: "chat-1",
        selfCharacterId: "antony",
        // cleo is gone from the room now.
        peers: [{ characterId: "brutus" }],
        everPeers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        lines: [line("l1", "brutus", "hi"), line("l9", "brutus", "she's gone")],
        // The backlog is authoritative and rebuilds the map wholesale.
        reconnectingPeers: [],
      },
      roster,
      "Rachel"
    ) as LiveMatch;
    // Missed line first, THEN the departure notice — the true order.
    expect(next.messages.map((m) => m.text)).toEqual([
      "hi",
      "she's gone",
      "Cleopatra 👑 couldn't get back in and left the chat",
    ]);
    expect(next.messages.at(-1)).toMatchObject({
      senderId: NOTICE_SENDER_ID,
      kind: "notice",
    });
    // The map is rebuilt from the (empty) backlog, not the carried-over one.
    expect(next.offlinePeers).toEqual({});
    expect(next.peers).toEqual([participant("brutus")]);
  });

  it("rebuilds the offline map wholesale from the backlog, dropping stale local entries", () => {
    const prev = liveMatch({ offlinePeers: { brutus: NOW + 10_000 } });
    const next = applyChatStarted(
      prev,
      {
        chatId: "chat-1",
        selfCharacterId: "antony",
        peers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        everPeers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        lines: [line("l1", "brutus", "hi")],
        // brutus is back per the backlog; cleo is the one now offline.
        reconnectingPeers: [{ characterId: "cleo", secondsLeft: 45 }],
      },
      roster,
      "Rachel"
    ) as LiveMatch;
    expect(next.offlinePeers).toEqual({ cleo: NOW + 45_000 });
  });

  it("clears a carried typing slot when the rebuilt backlog marks that peer offline", () => {
    const prev = liveMatch({ typingPeerId: "cleo" });
    const next = applyChatStarted(
      prev,
      {
        chatId: "chat-1",
        selfCharacterId: "antony",
        peers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        everPeers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        lines: [line("l1", "brutus", "hi")],
        reconnectingPeers: [{ characterId: "cleo", secondsLeft: 30 }],
      },
      roster,
      "Rachel"
    ) as LiveMatch;
    expect(next.typingPeerId).toBeNull();
  });

  it("keeps a carried typing slot when the backlog leaves that peer online", () => {
    const prev = liveMatch({ typingPeerId: "brutus" });
    const next = applyChatStarted(
      prev,
      {
        chatId: "chat-1",
        selfCharacterId: "antony",
        peers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        everPeers: [{ characterId: "brutus" }, { characterId: "cleo" }],
        lines: [line("l1", "brutus", "hi")],
        reconnectingPeers: [],
      },
      roster,
      "Rachel"
    ) as LiveMatch;
    expect(next.typingPeerId).toBe("brutus");
  });
});

describe("applyChatLine", () => {
  it("ignores a line for a different chat", () => {
    const prev = liveMatch();
    expect(
      applyChatLine(prev, { chatId: "other", line: line("x", "brutus", "?") })
    ).toBe(prev);
  });

  it("ignores a duplicate line id (a live line racing a resume backlog)", () => {
    const prev = liveMatch();
    expect(
      applyChatLine(prev, {
        chatId: "chat-1",
        line: line("l1", "brutus", "hi"),
      })
    ).toBe(prev);
  });

  it("appends the message and clears only the sender's own typing bubble", () => {
    const prev = liveMatch({ typingPeerId: "brutus" });
    const next = applyChatLine(prev, {
      chatId: "chat-1",
      line: line("l2", "brutus", "et tu?"),
    }) as LiveMatch;
    expect(next.typingPeerId).toBeNull();
    expect(next.messages.at(-1)).toEqual({
      id: "l2",
      senderId: "brutus",
      text: "et tu?",
    });
  });

  it("leaves another peer's typing bubble alone", () => {
    const prev = liveMatch({ typingPeerId: "cleo" });
    const next = applyChatLine(prev, {
      chatId: "chat-1",
      line: line("l2", "brutus", "hi"),
    }) as LiveMatch;
    expect(next.typingPeerId).toBe("cleo");
  });
});

describe("applyChatUpdate / shrinkToPeers", () => {
  it("returns prev unchanged when nobody left", () => {
    const prev = liveMatch();
    expect(
      applyChatUpdate(prev, {
        chatId: "chat-1",
        peers: [{ characterId: "brutus" }, { characterId: "cleo" }],
      })
    ).toBe(prev);
  });

  it("drops a leaver from peers, keeps them in everPeers, and posts a plain 'left' notice", () => {
    const prev = liveMatch();
    const next = applyChatUpdate(prev, {
      chatId: "chat-1",
      peers: [{ characterId: "brutus" }],
    }) as LiveMatch;
    expect(next.peers).toEqual([participant("brutus")]);
    expect(next.everPeers).toEqual([
      participant("brutus"),
      participant("cleo"),
    ]);
    expect(next.messages.at(-1)).toMatchObject({
      senderId: NOTICE_SENDER_ID,
      kind: "notice",
      text: "Cleopatra 👑 left the chat",
    });
  });

  it("uses the timeout copy for a leaver who was offline in the PREV map", () => {
    const prev = liveMatch({ offlinePeers: { cleo: NOW + 5_000 } });
    const next = shrinkToPeers(prev, [{ characterId: "brutus" }]);
    expect(next.messages.at(-1)).toMatchObject({
      text: "Cleopatra 👑 couldn't get back in and left the chat",
    });
    // The leaver's countdown dies with their membership.
    expect(next.offlinePeers).toEqual({});
  });

  it("clears a leaver's typing slot and pending return flash", () => {
    const prev = liveMatch({ typingPeerId: "cleo", returnedFlashId: "cleo" });
    const next = shrinkToPeers(prev, [{ characterId: "brutus" }]);
    expect(next.typingPeerId).toBeNull();
    expect(next.returnedFlashId).toBeNull();
  });
});

describe("applyPeerDropped", () => {
  it("records the offline deadline from the wire's remaining seconds", () => {
    const next = applyPeerDropped(liveMatch(), {
      chatId: "chat-1",
      characterId: "brutus",
      state: "dropped",
      secondsLeft: 40,
    }) as LiveMatch;
    expect(next.offlinePeers).toEqual({ brutus: NOW + 40_000 });
  });

  it("falls back to the full grace window when the wire omits seconds", () => {
    const next = applyPeerDropped(liveMatch(), {
      chatId: "chat-1",
      characterId: "brutus",
      state: "dropped",
      secondsLeft: null,
    }) as LiveMatch;
    expect(next.offlinePeers).toEqual({
      brutus: NOW + LOBBY_GRACE_SECONDS * 1000,
    });
  });

  it("ignores a drop for someone who isn't a current peer", () => {
    const prev = liveMatch();
    expect(
      applyPeerDropped(prev, {
        chatId: "chat-1",
        characterId: "ghost",
        state: "dropped",
        secondsLeft: 40,
      })
    ).toBe(prev);
  });

  it("clears the dropped peer's own typing bubble", () => {
    const prev = liveMatch({ typingPeerId: "brutus" });
    const next = applyPeerDropped(prev, {
      chatId: "chat-1",
      characterId: "brutus",
      state: "dropped",
      secondsLeft: 40,
    }) as LiveMatch;
    expect(next.typingPeerId).toBeNull();
  });
});

describe("applyPeerReturned", () => {
  it("no offline entry ⇒ no flash, no state change (the sub-4s-blip guard)", () => {
    const prev = liveMatch();
    expect(
      applyPeerReturned(prev, {
        chatId: "chat-1",
        characterId: "brutus",
        state: "returned",
        secondsLeft: null,
      })
    ).toBe(prev);
  });

  it("clears the offline entry and raises the return flash", () => {
    const prev = liveMatch({ offlinePeers: { brutus: NOW + 20_000 } });
    const next = applyPeerReturned(prev, {
      chatId: "chat-1",
      characterId: "brutus",
      state: "returned",
      secondsLeft: null,
    }) as LiveMatch;
    expect(next.offlinePeers).toEqual({});
    expect(next.returnedFlashId).toBe("brutus");
  });
});
