import { useEffect } from "react";

import { API_BASE_URL } from "./api";

/**
 * Fire-and-forget `GET /healthz` on mount, so the free-tier server (which
 * spins down when idle and takes ~30s to wake) is already up by the time
 * anyone submits a form. Teachers set up activities at the start of class;
 * the pages people land on first — the homepage, the join page, the create
 * page — all mount this. No UI, no error handling: if the ping fails, the
 * real call's own pending/unreachable states cover it.
 */
export function useWarmUpServer(): void {
  useEffect(() => {
    fetch(`${API_BASE_URL}/healthz`).catch(() => {});
  }, []);
}
