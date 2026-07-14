import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { characterLabel } from "@/lib/characterLabel";
import type { Participant } from "@/types/chat";

interface ChatHeaderProps {
  self: Participant;
  peers: Participant[];
  /** Rendered right after the peer list, e.g. " · played by a classmate". */
  peerSuffix?: ReactNode;
  /** Right-aligned slot, e.g. the student chatbox's End chat button. */
  actions?: ReactNode;
  /**
   * Distinct color (CSS var) per character id, as used in the feed. Dots the
   * roster popover so it ties back to the conversation. Optional: without it
   * the roster simply renders undotted.
   */
  characterColors?: Map<string, string>;
}

/**
 * The gradient "You're X … with Y" header shared by the student chatbox and
 * the homepage hero chatbox.
 *
 * The "with …" line is a summary, not a roster: a 1:1 spells out the peer, a
 * group shows the first peer plus an "and N others" pill, so the line fits at
 * any width no matter how long the teacher's character names run. Tapping the
 * line opens the who's-in-this-chat popover with everyone. Characters only —
 * real names stay hidden until the end-of-chat reveal. See DECISIONS.md →
 * "The chat header summarizes the room".
 */
export function ChatHeader({
  self,
  peers,
  peerSuffix,
  actions,
  characterColors,
}: ChatHeaderProps) {
  const [firstPeer] = peers;
  const hiddenPeerCount = peers.length - 1;
  const roster = [self, ...peers];

  return (
    <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-grape to-brand-grape-strong px-4 py-3 text-white">
      {/* Both lines wrap rather than truncate: names are teacher-authored, so
          a single long one can outgrow any width. */}
      <div className="min-w-0 leading-tight">
        <div className="text-[15px] font-semibold">
          <span className="font-normal text-white/70">You're </span>
          {characterLabel(self)}
        </div>

        {firstPeer && (
          <Popover>
            <PopoverTrigger className="block rounded-md text-left text-sm leading-snug text-white/85 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70">
              <span className="text-white/60">with </span>
              {characterLabel(firstPeer)}
              {hiddenPeerCount > 0 && (
                <span className="ms-1.5 inline-block rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-white">
                  and {hiddenPeerCount} other{hiddenPeerCount > 1 ? "s" : ""}
                </span>
              )}
              {peerSuffix}
            </PopoverTrigger>

            <PopoverContent align="start" sideOffset={8} className="w-56">
              <p className="text-xs font-semibold text-muted-foreground">
                Who's in this chat
              </p>
              <ul className="mt-2 space-y-1.5">
                {roster.map((participant) => {
                  const color = characterColors?.get(participant.character.id);
                  return (
                    <li
                      key={participant.id}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      {color && (
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      )}
                      <span className="min-w-0">
                        {characterLabel(participant)}
                        {participant.id === self.id && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            (you)
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {actions}
    </header>
  );
}
