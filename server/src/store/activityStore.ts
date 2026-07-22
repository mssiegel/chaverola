import { randomBytes, randomInt } from "node:crypto";

import { DEMO_JOIN_CODE } from "@chaverola/shared";
import type {
  ActivitySettings,
  Character,
  CharacterInput,
} from "@chaverola/shared";

import { capacity } from "../lib/httpErrors";
import type { StoredChat } from "../live/matching";
import { clearAllSeatTimers, createSeatState } from "../live/seats";
import type { ActivitySeats } from "../live/seats";

/*
  The whole persistence layer: two in-memory Maps on a single instance.
  Restarts and deploys wipe live classes — accepted for v1 (see
  docs/plans/feature-1-create-and-join.md; once real classes are live,
  avoid server-touching pushes during school hours). Activities live 12
  hours; only hostKey lookups refresh the clock, so students (or a
  code-enumerating crawler) can't keep an activity alive.
*/

/** The internal record. Never appears in a response — see projections.ts. */
export interface StoredActivity {
  joinCode: string;
  hostKey: string;
  hostName: string;
  characters: Character[];
  scenario?: string;
  teacherEmail?: string;
  settings: ActivitySettings;
  createdAt: number;
  lastSeenAt: number;
  /** The live lobby's seats — server-internal, never projected (the
   *  explicit-literal rule in projections.ts keeps it out by construction). */
  seats: ActivitySeats;
  /** Every chat ever started, in creation order (feature 3: chats never
   *  expire — the activity's lifecycle owns them). */
  chats: StoredChat[];
  /** studentId → everyone in their previous chat, overwritten each time a
   *  chat starts (one round deep). Powers the rematch heads-up and (feature
   *  9, prompts 2–3) the fresh-partner preference; in-memory only — a deploy
   *  wipes it, like chats and seats. Mirrors the demo's HostWorld.lastPartners. */
  lastPartners: Record<string, string[]>;
  /** Pair-everyone's odd one out — lazily nulled at snapshot build once
   *  that seat stops waiting. */
  leftoverStudentId: string | null;
  /** The teacher's world-level pause: set = paused, and the timestamp is
   *  the freeze anchor — snapshots clock against it, and resumeChats shifts
   *  the stored clocks forward by (now - pausedAt). */
  pausedAt: number | null;
}

/** A validated create request, post-zod: trimmed, blanks already omitted. */
export interface NewActivity {
  hostName: string;
  characters: CharacterInput[];
  scenario?: string;
  teacherEmail?: string;
  settings: ActivitySettings;
}

export const MAX_ACTIVITIES = 4000;
const TTL_MS = 12 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Both maps hold the same object refs — one record, two lookup paths.
const byJoinCode = new Map<string, StoredActivity>();
const byHostKey = new Map<string, StoredActivity>();

/** Slug a character name into an id, unique within this activity. Ported
 *  from the client's activity setup (it already handles Unicode/Hebrew). */
function toCharacterId(name: string, taken: Set<string>): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "character";
  let id = slug;
  let suffix = 2;
  while (taken.has(id)) id = `${slug}-${suffix++}`;
  taken.add(id);
  return id;
}

/**
 * Uniform over the free codes in 1000–9999 minus the demo's 1234 (the
 * server never issues it). 100 random draws hit a free code with near
 * certainty until the store is nearly full; the dense fallback enumerates
 * what's left and picks uniformly, so the last few codes are still uniform.
 */
function mintJoinCode(): string {
  for (let i = 0; i < 100; i++) {
    const code = String(randomInt(1000, 10000));
    if (code !== DEMO_JOIN_CODE && !byJoinCode.has(code)) return code;
  }
  const free: string[] = [];
  for (let n = 1000; n <= 9999; n++) {
    const code = String(n);
    if (code !== DEMO_JOIN_CODE && !byJoinCode.has(code)) free.push(code);
  }
  // The capacity guard runs first (4000 < 8999 free codes), so `free` is
  // never empty here.
  return free[randomInt(free.length)]!;
}

function mintHostKey(): string {
  // 18 random bytes → 24 base64url chars, 144 bits. The collision recheck
  // is pure paranoia at that size.
  let key = randomBytes(18).toString("base64url");
  while (byHostKey.has(key)) key = randomBytes(18).toString("base64url");
  return key;
}

function isExpired(record: StoredActivity, now: number): boolean {
  return now - record.lastSeenAt > TTL_MS;
}

/** The socket layer registers here so all three removal paths (the sweep +
 *  both lazy-expiry lookups) reach it. Never import io into this module. */
let activityRemovedListener: ((record: StoredActivity) => void) | undefined;

export function onActivityRemoved(cb: (record: StoredActivity) => void): void {
  activityRemovedListener = cb;
}

function remove(record: StoredActivity): void {
  byJoinCode.delete(record.joinCode);
  byHostKey.delete(record.hostKey);
  activityRemovedListener?.(record);
}

export function createActivity(
  input: NewActivity,
  now = Date.now()
): StoredActivity {
  if (byJoinCode.size >= MAX_ACTIVITIES) throw capacity();

  const taken = new Set<string>();
  const characters: Character[] = input.characters.map((row) => {
    const character: Character = {
      id: toCharacterId(row.name, taken),
      name: row.name,
    };
    if (row.emoji !== undefined) character.emoji = row.emoji;
    return character;
  });

  const record: StoredActivity = {
    joinCode: mintJoinCode(),
    hostKey: mintHostKey(),
    hostName: input.hostName,
    characters,
    settings: input.settings,
    createdAt: now,
    lastSeenAt: now,
    seats: createSeatState(),
    chats: [],
    lastPartners: {},
    leftoverStudentId: null,
    pausedAt: null,
  };
  if (input.scenario !== undefined) record.scenario = input.scenario;
  if (input.teacherEmail !== undefined)
    record.teacherEmail = input.teacherEmail;

  byJoinCode.set(record.joinCode, record);
  byHostKey.set(record.hostKey, record);
  return record;
}

/** Student lookup. Deliberately does NOT refresh the TTL — enumerating
 *  codes must not keep activities alive. */
export function getByJoinCode(
  joinCode: string,
  now = Date.now()
): StoredActivity | undefined {
  const record = byJoinCode.get(joinCode);
  if (!record) return undefined;
  if (isExpired(record, now)) {
    remove(record);
    return undefined;
  }
  return record;
}

/** Host lookup — the only TTL refresh: an activity stays alive exactly as
 *  long as a teacher keeps its host page open (the page's one fetch and the
 *  lobby's ~5-min teacher keep-alive both come through here). */
export function getByHostKey(
  hostKey: string,
  now = Date.now()
): StoredActivity | undefined {
  const record = byHostKey.get(hostKey);
  if (!record) return undefined;
  if (isExpired(record, now)) {
    remove(record);
    return undefined;
  }
  record.lastSeenAt = now;
  return record;
}

export function sweepExpired(now = Date.now()): void {
  for (const record of byJoinCode.values()) {
    if (isExpired(record, now)) remove(record);
  }
}

/** Called only from index.ts — tests and supertest never start the timer. */
export function startSweep(): void {
  setInterval(() => sweepExpired(), SWEEP_INTERVAL_MS).unref();
}

export function resetForTests(): void {
  for (const record of byJoinCode.values()) clearAllSeatTimers(record);
  byJoinCode.clear();
  byHostKey.clear();
  activityRemovedListener = undefined;
}
