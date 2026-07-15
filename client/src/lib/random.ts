/*
  Shared helpers for the demo engines (useChatDemo, useHostActivityDemo):
  session-unique ids and the random picks that keep the simulations varied.
*/

let idSeq = 0;

/** Session-unique id: the prefix plus a counter, e.g. nextId("seed") → "seed-8". */
export function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

/** Random integer between min and max, inclusive on both ends. */
export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Random element of an array. */
export function randomFrom<T>(items: readonly T[]): T {
  // Callers always pass non-empty arrays, and the index is < items.length.
  return items[Math.floor(Math.random() * items.length)]!;
}

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
