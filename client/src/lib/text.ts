/*
  Tiny text-measuring helpers behind the app's input caps (character names,
  the hosted-by name, the scene's word limit).
*/

/** Count by code points so multi-unit emoji count as one character. */
export function charCount(text: string): number {
  return Array.from(text).length;
}

/** Hard cap `text` at `max` code points (how the input caps block typing). */
export function clampChars(text: string, max: number): string {
  const points = Array.from(text);
  return points.length > max ? points.slice(0, max).join("") : text;
}

/** Whitespace-separated word count. */
export function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

/**
 * Hard cap `text` at `max` words. Whitespace right after the last kept word
 * survives, so once the cap is hit, typing a would-be next word is a stable
 * no-op instead of the new letters gluing themselves onto the final word.
 */
export function clampWords(text: string, max: number): string {
  let seen = 0;
  const words = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = words.exec(text))) {
    seen += 1;
    if (seen === max) {
      const wordEnd = match.index + match[0].length;
      const trailingWs = /^\s*/.exec(text.slice(wordEnd))?.[0] ?? "";
      return text.slice(0, wordEnd + trailingWs.length);
    }
  }
  return text;
}
