import { useState } from "react";

/**
 * The student's mock "sign-in": the name they entered and the activity they
 * joined. Kept in sessionStorage so a refresh (or hopping between student
 * stages) doesn't lose it, but closing the tab does — one tab, one student,
 * which matters on shared classroom computers. The join page also clears it
 * whenever the student lands back on code entry (see DECISIONS.md).
 */
export interface StudentSession {
  name: string;
  joinCode: string;
}

const STORAGE_KEY = "chaverola.studentSession";

function readStoredSession(): StudentSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as StudentSession).name === "string" &&
      typeof (parsed as StudentSession).joinCode === "string"
    ) {
      return parsed as StudentSession;
    }
  } catch {
    // Corrupt or inaccessible storage — treat as signed out.
  }
  return null;
}

/** Owns the student session for the student flow pages. */
export function useStudentSession() {
  const [session, setSession] = useState<StudentSession | null>(
    readStoredSession
  );

  const signIn = (next: StudentSession) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (e.g. blocked) — the in-memory session still works.
    }
    setSession(next);
  };

  const signOut = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    setSession(null);
  };

  return { session, signIn, signOut };
}
