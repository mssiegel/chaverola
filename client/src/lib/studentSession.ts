import { useState } from "react";

import {
  hasOptionalString,
  hasString,
  isRecord,
  readSessionJson,
  removeSessionItem,
  writeSessionJson,
} from "./storage";

/**
 * The student's sign-in: the name they entered and the activity they joined,
 * plus the live-lobby seat credentials as the server hands them out. Kept in
 * sessionStorage so a refresh (or hopping between student stages) doesn't
 * lose it, but closing the tab does — one tab, one student, which matters on
 * shared classroom computers. The join page also clears it whenever the
 * student lands back on code entry (see DECISIONS.md).
 */
export interface StudentSession {
  name: string;
  joinCode: string;
  /** Client-minted at signIn; lets the server treat a replayed fresh join
   *  (StrictMode double-mount, a refresh before lobby:welcome persisted) as
   *  a resume instead of a duplicate seat. Optional only because
   *  pre-live-lobby sessions lack it — the presence hook mints one lazily
   *  before the first connect. */
  nonce?: string;
  /** Server-minted at lobby:welcome — the seat-resume pair. Their presence
   *  is also the proof a join code WAS real, which is what tells the
   *  "activity ended" screen apart from a code that never worked. */
  studentId?: string;
  token?: string;
}

const STORAGE_KEY = "chaverola.studentSession";

/**
 * Mint a join nonce. crypto.randomUUID needs a secure context, which
 * LAN-http dev (a phone pointed at the dev box) is not — fall back to a
 * random-enough string; it's an idempotency key, not a secret.
 */
export function mintNonce(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Anything that isn't a well-formed session reads as signed out. */
function asStudentSession(parsed: unknown): StudentSession | null {
  if (
    isRecord(parsed) &&
    hasString(parsed, "name") &&
    hasString(parsed, "joinCode") &&
    hasOptionalString(parsed, "nonce") &&
    hasOptionalString(parsed, "studentId") &&
    hasOptionalString(parsed, "token")
  ) {
    return parsed as unknown as StudentSession;
  }
  return null;
}

/** Owns the student session for the student flow pages. */
export function useStudentSession() {
  const [session, setSession] = useState<StudentSession | null>(() =>
    readSessionJson(STORAGE_KEY, asStudentSession)
  );

  const signIn = (next: { name: string; joinCode: string }) => {
    const fresh: StudentSession = { ...next, nonce: mintNonce() };
    writeSessionJson(STORAGE_KEY, fresh);
    setSession(fresh);
  };

  /** Merge lobby credentials (lobby:welcome's studentId/token, a lazily
   *  minted nonce) into the signed-in session. No-op while signed out. */
  const updateSession = (
    patch: Partial<Pick<StudentSession, "nonce" | "studentId" | "token">>
  ) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeSessionJson(STORAGE_KEY, next);
      return next;
    });
  };

  const signOut = () => {
    removeSessionItem(STORAGE_KEY);
    setSession(null);
  };

  return { session, signIn, signOut, updateSession };
}
