import type {
  CreateActivityRequest,
  CreateActivityResponse,
  GetActivityResponse,
  GetHostedActivityResponse,
} from "@chaverola/shared";

/*
  The app's entire data-fetching layer — three typed calls over fetch, no
  library (see DECISIONS.md → the TanStack Query rejection). Failures are
  values, not exceptions: every call resolves to ApiResult, because a
  not-found activity is a normal screen to render, not an error to throw.
*/

/**
 * Why a call failed. `not_found` is a normal render state (wrong join code,
 * expired activity); `server` means the API answered but not with a 2xx
 * (a 5xx, a rate limit); `unreachable` means the request never got an
 * answer (offline, DNS, the API down).
 */
export type ApiFailureKind = "not_found" | "server" | "unreachable";

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; kind: ApiFailureKind };

/**
 * The API base URL, baked in at build time. Dev falls back to the local
 * server so `pnpm dev` needs no env file — but a production build without
 * VITE_API_URL must fail loudly at module init: a silent localhost fallback
 * in prod would strand every real call while the demo kept working, which
 * is exactly the kind of breakage nobody notices for a week.
 */
function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  // Trailing slashes would double up when paths are appended.
  if (configured) return configured.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://localhost:3001";
  throw new Error(
    "VITE_API_URL is not set. Production builds must bake in the API base URL (see client/.env.example)."
  );
}

export const API_BASE_URL = resolveApiBaseUrl();

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    return { ok: false, kind: "unreachable" };
  }
  if (!response.ok) {
    return {
      ok: false,
      kind: response.status === 404 ? "not_found" : "server",
    };
  }
  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    // A 2xx that isn't JSON is not our server behaving.
    return { ok: false, kind: "server" };
  }
}

/** `POST /activities` — create an activity, minting its joinCode + hostKey. */
export function createActivity(
  body: CreateActivityRequest
): Promise<ApiResult<CreateActivityResponse>> {
  return request<CreateActivityResponse>("/activities", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** `GET /activities/:joinCode` — the student projection. */
export function getActivity(
  joinCode: string
): Promise<ApiResult<GetActivityResponse>> {
  return request<GetActivityResponse>(`/activities/${joinCode}`);
}

/** `GET /activities/host/:hostKey` — the full activity, TTL-refreshing. */
export function getHostedActivity(
  hostKey: string
): Promise<ApiResult<GetHostedActivityResponse>> {
  return request<GetHostedActivityResponse>(`/activities/host/${hostKey}`);
}
