import { useState } from "react";

import {
  hasString,
  isRecord,
  readSessionJson,
  removeSessionItem,
  writeSessionJson,
} from "./storage";

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

/** Anything that isn't a well-formed session reads as signed out. */
function asStudentSession(parsed: unknown): StudentSession | null {
  if (
    isRecord(parsed) &&
    hasString(parsed, "name") &&
    hasString(parsed, "joinCode")
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

  const signIn = (next: StudentSession) => {
    writeSessionJson(STORAGE_KEY, next);
    setSession(next);
  };

  const signOut = () => {
    removeSessionItem(STORAGE_KEY);
    setSession(null);
  };

  return { session, signIn, signOut };
}
