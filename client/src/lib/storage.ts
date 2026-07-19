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

// Tiny guards for the `validate` callbacks above, so each stored shape can
// duck-type itself in a line or two instead of a ladder of typeof checks.

/** True when `value` is an object we can safely index into. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** True when `record[key]` is a string. */
export function hasString(
  record: Record<string, unknown>,
  key: string
): boolean {
  return typeof record[key] === "string";
}

/** True when `record[key]` is a string or absent — for optional fields. */
export function hasOptionalString(
  record: Record<string, unknown>,
  key: string
): boolean {
  return record[key] === undefined || typeof record[key] === "string";
}
