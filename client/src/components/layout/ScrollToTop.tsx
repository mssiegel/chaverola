import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

import { localePrefix } from "@/lib/locale";

/**
 * Opens every page at the top. SPA navigation keeps the window's scroll
 * position, so without this a link clicked far down the homepage opens the
 * next page mid-scroll (the teacher demo was the first complaint). Two
 * deliberate exceptions: back/forward (POP) leaves restoration to the
 * browser, and a language switch — same page, only the `/he` prefix changes —
 * keeps your place. Layout effect so the jump lands before paint.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  // "/he/activity/join" and "/activity/join" are the same page, so compare
  // paths with the locale prefix stripped.
  const barePath = pathname.slice(localePrefix(pathname).length) || "/";
  const previousPathRef = useRef(barePath);

  useLayoutEffect(() => {
    const moved = previousPathRef.current !== barePath;
    previousPathRef.current = barePath;
    if (moved && navigationType !== "POP") window.scrollTo(0, 0);
  }, [barePath, navigationType]);

  return null;
}
