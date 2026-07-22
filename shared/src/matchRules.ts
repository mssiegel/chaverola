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

/** "A and B" / "A, B, and C" — shared by the heads-up and the rail notice. */
export function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Pair-everyone's rail notice for an exact pair/trio it left in line. Unlike
 *  the heads-up this isn't gated on the rematchWarning setting — it explains
 *  why the button visibly skipped them. */
export function stuckInLineNotice(names: string[]): string {
  return `${listNames(names)} just chatted ${
    names.length === 2 ? "with each other" : "together"
  }, so they're still in line.`;
}

/**
 * Pair-everyone's decision, ids only — the pure half both engines share.
 * Greedy in queue order, preferring fully fresh partners, then anyone who
 * wouldn't be rerunning their own previous chat exactly. An exact rematch is
 * never grouped: a stranded pair is repaired by one swap with a pairing
 * already made (or a trio/leftover seat), and only when the queue IS exactly
 * that pair (or an exact trio) do they stay in line as `stuckIds`. An odd
 * pool sheds a trailing trio when a 3rd character exists, otherwise the
 * newest joiner is the `leftoverId`. The caller passes an already-filtered
 * pool (connected, eligible) in queue order and maps the ids back to its own
 * seat shape; null under 2 (nothing to plan — the existing leftover/notice
 * stay untouched).
 */
export function pairEveryonePlan(
  ids: string[],
  characterCount: number,
  lastPartners: Record<string, string[]>
): {
  groups: string[][];
  leftoverId: string | null;
  stuckIds: string[];
} | null {
  const pool = [...ids];
  if (pool.length < 2) return null;

  // Odd count sheds a trailing trio (a 3rd character exists) or the newest
  // joiner as the leftover (two-character roster) — the shared split rule.
  // Both stay reassignable: the swap-repair below trades trio/leftover seats.
  let { leftover, trio } = splitOddPool(pool, characterCount);

  const pairs: [string, string][] = [];
  while (pool.length >= 2) {
    const a = pool.shift()!;
    let index = pool.findIndex((b) => isFreshPair(lastPartners, a, b));
    if (index === -1) {
      index = pool.findIndex((b) => !isExactRematchIn(lastPartners, [a, b]));
    }
    if (index === -1) {
      // Exactness is mutual and one round deep, so a can only be exact with
      // one student — the pool is down to a's previous 1:1 partner.
      pool.unshift(a);
      break;
    }
    pairs.push([a, pool.splice(index, 1)[0]!]);
  }

  // A stranded pair's memories are pinned to each other, so seating either
  // of them with ANYONE else can't be an exact rerun — one swap always fixes
  // it. Only a queue of exactly these two has nobody to swap with.
  let stuck: string[] = [];
  if (pool.length === 2) {
    const [x, y] = pool as [string, string];
    const donor = pairs.pop();
    if (donor) {
      const [p, q] = donor;
      const freshCount = (m: [string, string][]) =>
        m.filter(([s, t]) => isFreshPair(lastPartners, s, t)).length;
      const straight: [string, string][] = [
        [x, p],
        [y, q],
      ];
      const crossed: [string, string][] = [
        [x, q],
        [y, p],
      ];
      pairs.push(
        ...(freshCount(crossed) > freshCount(straight) ? crossed : straight)
      );
    } else if (trio) {
      // Trade a trio seat: the trio takes x, and the traded member pairs
      // with y — neither result can be an exact rerun.
      const traded = trio.pop()!;
      trio.push(x);
      pairs.push([traded, y]);
    } else if (leftover) {
      const seated = isFreshPair(lastPartners, x, leftover) ? x : y;
      const waits = seated === x ? y : x;
      pairs.push([seated, leftover]);
      leftover = waits;
    } else {
      stuck = [x, y];
    }
  }

  if (trio && isExactRematchIn(lastPartners, trio)) {
    const donor = pairs.pop();
    if (donor) {
      // Swapping any one member breaks the trio's exactness, and the traded
      // member's two-person memory can't exactly match a pair.
      const [p, q] = donor;
      const traded = trio.pop()!;
      trio.push(p);
      pairs.push([q, traded]);
    } else {
      stuck = trio;
      trio = null;
    }
  }

  const groups: string[][] = [...pairs];
  if (trio) groups.push(trio);

  return { groups, leftoverId: leftover ?? null, stuckIds: stuck };
}
