import { useEffect, useState } from "react";

import { getActivity } from "@/lib/api";
import { DEMO_JOIN_CODE, demoActivity } from "@/mockData";
import type { Activity } from "@/types/activity";

/**
 * Resolving the join code in the URL to an activity. `not-found` and
 * `unreachable` are distinct on purpose: a wrong code means "recheck it",
 * an unreachable server means "not your fault, try again" — and only the
 * first may sign a student out. A non-2xx that isn't a 404 (a 5xx, a rate
 * limit) reads as `unreachable` too: for a student the situation is the
 * same — the activity may well exist, try again shortly.
 */
export type ActivityLookup =
  | { state: "idle" } // no code in the URL
  | { state: "loading" }
  | { state: "found"; activity: Activity }
  | { state: "not-found" }
  | { state: "unreachable" };

/**
 * How long a lookup runs before the UI's waiting copy should admit it's a
 * free-tier wake-up (~30s), not a normal loading beat. Real-user timing —
 * never demo-scaled.
 */
export const SLOW_LOOKUP_HINT_MS = 5_000;

/**
 * Hand-off from the code-entry submit (which already fetched the activity)
 * to the lookup this hook runs after NAVIGATING to /activity/join/:code —
 * without it the code→name swap would flash a loading screen and burn a
 * second lookup on a fresh fetch of data we got milliseconds ago. Only for
 * the cross-route case: the target route's fresh mount reads the map on its
 * first render, before anything can be memoized against it. Same-URL
 * hand-offs must use `deliver` instead — the React Compiler may cache a
 * render-time `handedOff.get(...)` and never observe a later write (it
 * did, during Prompt 5's verification). Entries are only written from a
 * fetch that just succeeded, so staleness is bounded by SPA-session length
 * (a page refresh starts empty and refetches).
 */
const handedOff = new Map<string, Activity>();

export function primeActivityLookup(activity: Activity): void {
  handedOff.set(activity.joinCode, activity);
}

/**
 * Look up the activity behind a join code. The demo code resolves
 * synchronously with zero network — the demo works offline forever. Real
 * codes go through `GET /activities/:joinCode`.
 *
 * `slow` is true once a still-loading lookup has blown past
 * SLOW_LOOKUP_HINT_MS. `deliver` hands the hook an activity a caller
 * fetched itself (the code-entry submit, when the code is already in the
 * URL so no navigation will remount anything) — it goes through hook
 * state, the only channel a render is guaranteed to observe.
 */
export function useActivityLookup(joinCode: string | undefined): {
  lookup: ActivityLookup;
  slow: boolean;
  deliver: (activity: Activity) => void;
} {
  const [settled, setSettled] = useState<{
    joinCode: string;
    lookup: ActivityLookup;
  } | null>(null);
  // Which code's fetch blew past the slow-hint mark. Keyed instead of a
  // boolean so a new lookup needs no synchronous reset — a stale mark just
  // stops matching.
  const [slowMark, setSlowMark] = useState<string | null>(null);

  useEffect(() => {
    if (joinCode === undefined || joinCode === DEMO_JOIN_CODE) return;
    if (handedOff.has(joinCode)) return;
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlowMark(joinCode);
    }, SLOW_LOOKUP_HINT_MS);
    void getActivity(joinCode).then((result) => {
      clearTimeout(slowTimer);
      if (cancelled) return;
      setSettled({
        joinCode,
        lookup: result.ok
          ? { state: "found", activity: result.data.activity }
          : result.kind === "not_found"
            ? { state: "not-found" }
            : { state: "unreachable" },
      });
    });
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [joinCode]);

  const deliver = (activity: Activity) => {
    setSettled({
      joinCode: activity.joinCode,
      lookup: { state: "found", activity },
    });
  };

  if (joinCode === undefined) {
    return { lookup: { state: "idle" }, slow: false, deliver };
  }
  if (joinCode === DEMO_JOIN_CODE) {
    return {
      lookup: { state: "found", activity: demoActivity },
      slow: false,
      deliver,
    };
  }
  // Settled state outranks the hand-off map: a fresh mount reads the map
  // reliably, but later renders may see a memoized (stale) `get`, so state
  // is the source of truth once it exists.
  if (settled !== null && settled.joinCode === joinCode) {
    return { lookup: settled.lookup, slow: false, deliver };
  }
  const primed = handedOff.get(joinCode);
  if (primed !== undefined) {
    return {
      lookup: { state: "found", activity: primed },
      slow: false,
      deliver,
    };
  }
  return {
    lookup: { state: "loading" },
    slow: slowMark === joinCode,
    deliver,
  };
}
