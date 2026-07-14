import { useEffect, useRef } from "react";

/**
 * Intercepts browser back while `active`: the pop is swallowed by re-pushing
 * the current entry, and `onBack` runs instead. The join flow uses this so a
 * stray back-swipe during a live chat opens the end-chat confirmation rather
 * than silently landing on code entry and killing the chat (see DECISIONS.md
 * → "Back during a live chat asks before ending it").
 *
 * Arming pushes a sentinel copy of the current entry so the first back has
 * somewhere to land that isn't a real navigation. The sentinel stays behind
 * after disarming, so the first back after the chat ends is swallowed
 * silently before history really moves — a small wart, and the ended screen's
 * designed exit is its own button anyway. (React 19 StrictMode double-arms in
 * dev, adding one more swallowed back; harmless, dev-only.)
 */
export function useBackGuard(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    // Clone the current entry's state: react-router keeps its own bookkeeping
    // (entry key/index) in history.state, and a null state would confuse it.
    window.history.pushState(window.history.state, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(window.history.state, "", window.location.href);
      onBackRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [active]);
}
