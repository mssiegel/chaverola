import { useEffect, useRef } from "react";

/**
 * A ref that always holds the latest `value` — for timer and event callbacks
 * that fire after a render and must read fresh state without re-subscribing.
 * Synced in an effect (not during render) so the React Compiler can optimize
 * callers; timers fire after the commit, so the ref is current by then.
 * Callers may also write `.current` eagerly when a same-tick read must see a
 * value before the next render lands.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
