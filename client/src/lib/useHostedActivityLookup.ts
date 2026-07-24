import { useEffect, useState } from "react";

import { HOST_KEY_PATTERN } from "@chaverola/shared";
import { getHostedActivity } from "@/lib/api";
import type { HostedActivity } from "@/types/activity";

/**
 * Resolving the host page's URL key to the teacher's full activity. Same
 * split as the student lookup: `not-found` is a normal screen (a stale link
 * from an activity that already expired), `unreachable` means try again —
 * and only the host side gets a retry, because a teacher stuck on this
 * screen mid-class needs a way back in that isn't a full reload.
 */
export type HostedActivityLookup =
  | { state: "loading" }
  | { state: "found"; activity: HostedActivity }
  | { state: "not-found" }
  | { state: "unreachable" };

/**
 * Cross-route hand-off from the create submit, which already holds the
 * activity the server just minted — without it, landing on the host page
 * would flash a loading screen refetching data we got milliseconds ago.
 * Safe to read at render time ONLY on a fresh mount (the navigation from
 * `/activity/create` remounts the page); see useActivityLookup's map for
 * the React Compiler caveat that rules out same-URL hand-offs this way.
 */
const handedOff = new Map<string, HostedActivity>();

export function primeHostedActivityLookup(
  hostKey: string,
  activity: HostedActivity
): void {
  handedOff.set(hostKey, activity);
}

/**
 * Look up the activity behind a host key via `GET /activities/host/:hostKey`
 * (which also refreshes the activity's TTL — an open host page keeps its
 * class alive across refreshes). A param that can't be a real key — a stale
 * 4-digit link, garbage, the demo's `1234` (the page renders the demo before
 * consulting this) — settles as `not-found` with no network trip; the server
 * would 404 it anyway. `retry` refetches after an `unreachable` answer.
 */
export function useHostedActivityLookup(hostKey: string | undefined): {
  lookup: HostedActivityLookup;
  retry: () => void;
} {
  const [settled, setSettled] = useState<{
    key: string;
    attempt: number;
    lookup: HostedActivityLookup;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (hostKey === undefined || !HOST_KEY_PATTERN.test(hostKey)) return;
    if (attempt === 0 && handedOff.has(hostKey)) return;
    let cancelled = false;
    void getHostedActivity(hostKey).then((result) => {
      if (cancelled) return;
      setSettled({
        key: hostKey,
        attempt,
        lookup: result.ok
          ? { state: "found", activity: result.data.activity }
          : result.kind === "not_found"
            ? { state: "not-found" }
            : { state: "unreachable" },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hostKey, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  if (hostKey === undefined || !HOST_KEY_PATTERN.test(hostKey)) {
    return { lookup: { state: "not-found" }, retry };
  }
  // Settled state outranks the hand-off map, same as the student lookup:
  // a fresh mount reads the map reliably, later renders might not.
  if (
    settled !== null &&
    settled.key === hostKey &&
    settled.attempt === attempt
  ) {
    return { lookup: settled.lookup, retry };
  }
  if (attempt === 0) {
    const primed = handedOff.get(hostKey);
    if (primed !== undefined) {
      return { lookup: { state: "found", activity: primed }, retry };
    }
  }
  return { lookup: { state: "loading" }, retry };
}
