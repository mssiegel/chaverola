import { shuffled } from "./random";

/*
  The genuinely-pure matching primitives — byte-identical on both sides, so
  they live here once instead of as prose-guarded mirrors. The server's
  matching.ts and the client's hostWorld.ts demo both import these; the
  shape-specific machinery (rematch memory, the swap-repair pairing loop, id
  minting, tickWorld) stays in each engine. A neutral zero-dep module, not a
  server dependency on client code — the precedent is LOBBY_GRACE_SECONDS.
  See DECISIONS → "One implementation of the pure matching rules".
*/

/**
 * The members of a room still actually in it: everyone whose id isn't in the
 * inactive set. `idOf` bridges the two member shapes — the server keys chat
 * members by `studentId`, the client's participants by `id`.
 */
export function activeMembersBy<T>(
  members: readonly T[],
  inactiveIds: readonly string[],
  idOf: (member: T) => string
): T[] {
  return members.filter((member) => !inactiveIds.includes(idOf(member)));
}

/**
 * Deal a cast for a chat of `count` seats: the roster's first `count`
 * characters, shuffled. This is the setup form's promise that a chat of N
 * always uses characters 1..N, and WHO gets WHICH is chance.
 */
export function dealCast<T>(characters: readonly T[], count: number): T[] {
  return shuffled(characters.slice(0, count));
}

/**
 * Pair-everyone's odd-count rule, applied in place: an even pool is left
 * untouched; an odd pool either sheds its last three as a trio (when a 3rd
 * character exists, so nobody sits out) or pops the newest joiner as the
 * leftover (a two-character roster). Mutates `pool` — the caller pairs
 * whatever remains — and returns the trio/leftover it removed. Callers guard
 * `pool.length < 2` first, so an odd pool here always has at least three.
 */
export function splitOddPool<T>(
  pool: T[],
  characterCount: number
): { leftover: T | null; trio: T[] | null } {
  let leftover: T | null = null;
  let trio: T[] | null = null;
  if (pool.length % 2 === 1) {
    if (characterCount >= 3) {
      trio = pool.splice(pool.length - 3, 3);
    } else {
      leftover = pool.pop() ?? null;
    }
  }
  return { leftover, trio };
}

/**
 * True only when EVERY member's previous chat was exactly this group. A
 * partial overlap — Bob's last chat was Rachel, but Rachel has chatted since —
 * doesn't count: nobody would be rerunning their own last round.
 */
export function isExactRematchIn(
  lastPartners: Record<string, string[]>,
  ids: string[]
): boolean {
  if (ids.length < 2) return false;
  return ids.every((id) => {
    const last = lastPartners[id];
    return (
      last !== undefined &&
      last.length === ids.length - 1 &&
      ids.every((other) => other === id || last.includes(other))
    );
  });
}

/** Did A's previous chat include B? One-directional — isFreshPair checks both
 *  ways. */
function wereLastPartnersIn(
  lastPartners: Record<string, string[]>,
  aId: string,
  bId: string
): boolean {
  return lastPartners[aId]?.includes(bId) ?? false;
}

/** Fresh both ways: neither student's previous chat included the other. */
export function isFreshPair(
  lastPartners: Record<string, string[]>,
  aId: string,
  bId: string
): boolean {
  return (
    !wereLastPartnersIn(lastPartners, aId, bId) &&
    !wereLastPartnersIn(lastPartners, bId, aId)
  );
}

/**
 * Auto-match's choice from the ready pool — connected students past the wait
 * threshold, in queue order. The first fully-fresh pair when any exists, then
 * the first pair that wouldn't be an exact rerun for both; an exact rematch is
 * never returned (those two wait for someone new). Ids only — the caller maps
 * them back to its own seat/queue shape.
 */
export function pickAutoMatchPair(
  readyIds: string[],
  lastPartners: Record<string, string[]>
): [string, string] | null {
  for (let i = 0; i < readyIds.length; i++) {
    for (let j = i + 1; j < readyIds.length; j++) {
      // Both loop indexes are within bounds.
      if (isFreshPair(lastPartners, readyIds[i]!, readyIds[j]!)) {
        return [readyIds[i]!, readyIds[j]!];
      }
    }
  }
  for (let i = 0; i < readyIds.length; i++) {
    for (let j = i + 1; j < readyIds.length; j++) {
      if (!isExactRematchIn(lastPartners, [readyIds[i]!, readyIds[j]!])) {
        return [readyIds[i]!, readyIds[j]!];
      }
    }
  }
  return null;
}
