import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { useLatestRef } from "./useLatestRef";

/**
 * A once-a-second countdown (null: no clock running). Ticks down while
 * `active`; at zero it clears itself to null and fires `onExpire` once. The
 * setter is exposed because engines drive the clock from actions — starting
 * a reconnect window, clearing it on reconnect, fast-forwarding in the demo
 * controls.
 */
export function useSecondCountdown(
  initialSeconds: number | null,
  active: boolean,
  onExpire: () => void
): [number | null, Dispatch<SetStateAction<number | null>>] {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initialSeconds);
  const onExpireRef = useLatestRef(onExpire);

  // Zero renders for a beat before the expiry timeout (0ms) fires — and any
  // action that restarts or clears the clock meanwhile cancels the expiry.
  useEffect(() => {
    if (secondsLeft === null || !active) return;
    const handle = setTimeout(
      () => {
        if (secondsLeft > 0) {
          setSecondsLeft((s) => (s === null ? null : s - 1));
        } else {
          setSecondsLeft(null);
          onExpireRef.current();
        }
      },
      secondsLeft > 0 ? 1000 : 0
    );
    return () => clearTimeout(handle);
  }, [secondsLeft, active, onExpireRef]);

  return [secondsLeft, setSecondsLeft];
}
