import { useEffect } from "react";

/** The brand and bare fallback title, matching `<title>` in index.html. */
const BRAND = "Chaverola";

/**
 * Sets `document.title` to "<title> | Chaverola" for the current page and
 * restores the bare brand on unmount, so routes that don't set their own
 * title fall back cleanly. Callers pass just the page's own name.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | ${BRAND}`;
    return () => {
      document.title = BRAND;
    };
  }, [title]);
}
