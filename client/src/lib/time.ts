/** 103 → "1:43" — the m:ss clock shared by every countdown surface. */
export function formatSecondsAsClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** 45 → "45s", 130 → "2m" — the compact wait time on lobby chips. */
export function formatWaitShort(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m`;
}
