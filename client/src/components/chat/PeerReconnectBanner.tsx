import type { ReactNode } from "react";
import { Loader2, Wifi, WifiOff } from "lucide-react";

import { RECONNECT_WINDOW_SECONDS } from "@/components/chat/useChatDemo";
import { cn } from "@/lib/utils";
import type { PeerConnectionState } from "@/types/chat";

interface PeerReconnectBannerProps {
  peerState: PeerConnectionState;
  /** Character name of the peer whose connection changed. */
  peerName: string | null;
  /**
   * Seconds the disconnected peer has left to come back, or null when no
   * reconnect window is running. Shown as a live m:ss countdown.
   */
  reconnectSecondsLeft?: number | null;
}

/** 103 → "1:43". */
function formatSecondsLeft(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * A slide-in banner that surfaces peer connection changes (disconnect →
 * reconnecting → back). While a peer is out it counts down their reconnect
 * window live. Hidden while everyone is connected.
 */
export function PeerReconnectBanner({
  peerState,
  peerName,
  reconnectSecondsLeft = null,
}: PeerReconnectBannerProps) {
  if (peerState === "connected") return null;

  const name = peerName ?? "Your partner";

  const config: Record<
    Exclude<PeerConnectionState, "connected">,
    { icon: ReactNode; text: ReactNode; className: string }
  > = {
    disconnected: {
      icon: <WifiOff className="size-4" />,
      text:
        reconnectSecondsLeft === null ? (
          `${name} lost connection…`
        ) : (
          <>
            {name} lost connection…{" "}
            {/* The ticking clock stays out of the live region so screen
                readers hear the announcement once, not sixty times a minute. */}
            <span aria-hidden>
              <span className="tabular-nums">
                {formatSecondsLeft(reconnectSecondsLeft)}
              </span>
              {" to come back"}
            </span>
            <span className="sr-only">
              they have {RECONNECT_WINDOW_SECONDS / 60} minutes to come back
            </span>
          </>
        ),
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    reconnecting: {
      icon: <Loader2 className="size-4 animate-spin" />,
      text: "Reconnecting…",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    reconnected: {
      icon: <Wifi className="size-4" />,
      text: `${name} is back! 🎉`,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  };
  const { icon, text, className } = config[peerState];

  return (
    <div
      className={cn(
        "mx-auto flex w-fit max-w-full animate-in items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm fade-in slide-in-from-top-2",
        className
      )}
      role="status"
    >
      {icon}
      {/* Wraps rather than truncates: clipping would eat the countdown on
          narrow phones ("Caesar's ghost 👻 lost connection… 2:00 to co…"). */}
      <span className="min-w-0 text-center">{text}</span>
    </div>
  );
}
