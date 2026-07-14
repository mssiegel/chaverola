/*
  Tiny sessionStorage helpers behind the app's per-tab persistence (student
  session, setup draft, hosted-activity hand-off). Storage can be blocked or
  hold corrupt JSON on classroom devices, so every call absorbs failures:
  reads fall back to null, writes become no-ops and the in-memory state keeps
  working.
*/

/**
 * Read and validate a JSON value from sessionStorage. Returns null when the
 * key is missing, storage is inaccessible, the JSON is corrupt, or `validate`
 * rejects the parsed value.
 */
export function readSessionJson<T>(
  key: string,
  validate: (parsed: unknown) => T | null
): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSessionJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — callers keep working from memory.
  }
}

export function removeSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
