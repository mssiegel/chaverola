import { Loader2, Wifi, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PeerConnectionState } from "@/types/chat";

interface PeerReconnectBannerProps {
  peerState: PeerConnectionState;
  /** Character name of the peer whose connection changed. */
  peerName: string | null;
}

/**
 * A slide-in banner that surfaces peer connection changes (disconnect →
 * reconnecting → back). Hidden while everyone is connected.
 */
export function PeerReconnectBanner({
  peerState,
  peerName,
}: PeerReconnectBannerProps) {
  if (peerState === "connected") return null;

  const name = peerName ?? "Your partner";

  const config = {
    disconnected: {
      icon: <WifiOff className="size-4" />,
      text: `${name} lost connection…`,
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
  }[peerState];

  return (
    <div
      className={cn(
        "mx-auto flex w-fit max-w-full animate-in items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm fade-in slide-in-from-top-2",
        config.className
      )}
      role="status"
    >
      {config.icon}
      <span className="truncate">{config.text}</span>
    </div>
  );
}
