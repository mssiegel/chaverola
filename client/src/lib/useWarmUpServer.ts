import { useEffect } from "react";

import { API_BASE_URL } from "./api";

/**
 * Fire-and-forget `GET /healthz` on mount, so the free-tier server (which
 * spins down when idle and takes ~30s to wake) is already up by the time
 * anyone submits a form. Teachers set up activities at the start of class;
 * the pages people land on first — the homepage, the join page, the create
 * page — all mount this. No UI, no error handling: if the ping fails, the
 * real call's own pending/unreachable states cover it.
 *
 * Deliberately mounted per entry surface, NOT once in App.tsx: App mounts
 * once per page load, so a run-once ping couldn't re-warm a server that
 * spun down while a visitor idled before navigating into the form, and the
 * demo routes must stay zero-network (see DECISIONS.md → "Teachers set up
 * at class start, and a warm-up ping hides the cold start").
 */
export function useWarmUpServer(): void {
  useEffect(() => {
    fetch(`${API_BASE_URL}/healthz`).catch(() => {});
  }, []);
}
