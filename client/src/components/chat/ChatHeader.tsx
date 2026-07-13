import type { ReactNode } from "react";

import { characterLabel, peerListLabel } from "@/lib/characterLabel";
import type { Participant } from "@/types/chat";

interface ChatHeaderProps {
  self: Participant;
  peers: Participant[];
  /** Rendered right after the peer list, e.g. " · played by a classmate". */
  peerSuffix?: ReactNode;
  /** Right-aligned slot, e.g. the student chatbox's End chat button. */
  actions?: ReactNode;
}

/**
 * The gradient "You're X … with Y" header shared by the student chatbox and
 * the homepage hero chatbox.
 */
export function ChatHeader({
  self,
  peers,
  peerSuffix,
  actions,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-grape to-brand-grape-strong px-4 py-3 text-white">
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[15px] font-semibold">
          <span className="font-normal text-white/70">You're </span>
          {characterLabel(self)}
        </div>
        <div className="truncate text-sm text-white/85">
          <span className="text-white/60">with </span>
          {peerListLabel(peers)}
          {peerSuffix}
        </div>
      </div>

      {actions}
    </header>
  );
}
