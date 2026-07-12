import { useEffect } from "react";

/** The fallback title, matching `<title>` in index.html. */
const DEFAULT_TITLE = "Chaverola";

/**
 * Sets `document.title` for the current page and restores the app default on
 * unmount, so routes that don't set their own title fall back cleanly.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
