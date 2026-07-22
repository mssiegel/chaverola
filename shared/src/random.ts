/*
  Random helpers shared by both engines and the demo simulations. Zero-dep by
  charter — Math.random, never node:crypto — so client (Vite) and server (tsx)
  both resolve it straight from source with nothing to build.
*/

/** A shuffled copy (Fisher–Yates); the input stays untouched. */
export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Both indexes are within bounds by construction.
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
