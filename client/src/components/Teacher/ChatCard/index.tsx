import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronsDownUp, ChevronsUpDown, LogOut } from "lucide-react";

import { CHAT_FRAME_CLASS } from "@/components/chat/ChatFrame";
import { ConversationLines } from "@/components/chat/ConversationLines";
import { EndChatConfirmationModal } from "@/components/chat/EndChatConfirmationModal";
import { Button } from "@/components/ui/button";
import type { Character } from "@chaverola/shared";

import {
  assignCharacterColors,
  rosterCharacterColors,
} from "@/lib/characterColor";
import { cn } from "@/lib/utils";
import type { ChatMessage, Participant } from "@/types/chat";

import { ChatCardHeader } from "./ChatCardHeader";

/** Collapsed cards show only this many of the latest lines. */
const COLLAPSED_LINE_COUNT = 5;

export interface ChatCardProps {
  participants: Participant[];
  messages: ChatMessage[];
  /** Completed chats render the muted variant with no End chat button. */
  isEnded: boolean;
  /** Hide the status badge in the homepage's mock chat preview. */
  showStatusBadge?: boolean;
  /** Show unavailable management controls in the homepage preview. */
  showDisabledControls?: boolean;
  /** The activity-wide pause: badge and clock freeze (never per chat). */
  isPaused?: boolean;
  /** Omit to hide End chat unless disabled preview controls are requested. */
  onEndChat?: () => void;
  /** Shown in the conversation area while there are no messages — a real
   *  empty state, since a live card is silent until its first message and
   *  a chat can end before one. Omit to render an empty feed. */
  emptyHint?: string;
  /**
   * Participants who left the room mid-chat (removed by the teacher). Their
   * lines and colors persist; the header just mutes them.
   */
  inactiveParticipantIds?: ReadonlySet<string>;
  /** Active members riding a dropped connection (live cards) — dimmed in
   *  the header with a lost-connection tag. */
  reconnectingParticipantIds?: ReadonlySet<string>;
  /** When set, each active participant row gets a remove control (live only). */
  onRemoveParticipant?: (participant: Participant) => void;
  /** The activity's character roster. When set, colors follow roster order so
   *  a character keeps one color across every card; omit (homepage preview)
   *  to fall back to participant order. */
  roster?: Character[];
}

/**
 * One chat on the teacher's monitoring grid. Presentational, following the
 * shared chatbox layout: header (who's really who) → conversation (last few
 * lines, expandable to the full chat) → bottom section (expand/minimize and,
 * while the chat is live, End chat). Completed chats reuse the same card in a
 * muted, desaturated look.
 */
export function ChatCard({
  participants,
  messages,
  isEnded,
  showStatusBadge = true,
  showDisabledControls = false,
  isPaused = false,
  onEndChat,
  emptyHint,
  inactiveParticipantIds,
  reconnectingParticipantIds,
  onRemoveParticipant,
  roster,
}: ChatCardProps) {
  // `common`, not `teacher`: the homepage renders this card too, and its
  // chunk registers only `home`. See DECISIONS.md.
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasExpanded = useRef(false);

  // Colors follow roster order when the roster is known, so a character holds
  // the same color on every card of the grid — same palette the student
  // chatbox draws from. Without a roster (homepage preview) they follow
  // participant order.
  const characterColors = roster
    ? rosterCharacterColors(roster, participants)
    : assignCharacterColors(participants.map((p) => p.character.id));

  const hiddenCount = Math.max(0, messages.length - COLLAPSED_LINE_COUNT);
  const visibleMessages = expanded
    ? messages
    : messages.slice(-COLLAPSED_LINE_COUNT);

  // The expanded view sticks to the newest line: jump there on open, then
  // glide as new messages arrive. (Scrolls only this card's own container —
  // never the page.)
  useEffect(() => {
    if (!expanded) {
      wasExpanded.current = false;
      return;
    }
    const justExpanded = !wasExpanded.current;
    wasExpanded.current = true;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: justExpanded ? "auto" : "smooth",
    });
  }, [expanded, messages]);

  const handleConfirmEnd = () => {
    setConfirmOpen(false);
    onEndChat?.();
  };

  return (
    <section
      className={cn(
        CHAT_FRAME_CLASS,
        "shadow-md",
        isEnded && "opacity-95 saturate-[.6]"
      )}
    >
      <ChatCardHeader
        participants={participants}
        characterColors={characterColors}
        isEnded={isEnded}
        showStatusBadge={showStatusBadge}
        showDisabledControls={showDisabledControls}
        isPaused={isPaused}
        inactiveParticipantIds={inactiveParticipantIds}
        reconnectingParticipantIds={reconnectingParticipantIds}
        onRemoveParticipant={onRemoveParticipant}
      />

      {/* Conversation */}
      <div className="relative">
        <div
          ref={scrollRef}
          className={cn(
            "px-3 py-2.5 text-[14px] leading-6 sm:px-4",
            // Min heights: a near-empty live card shouldn't grow line by line
            // as the first messages arrive; an ended card just needs enough
            // room to show the chat was empty.
            isEnded ? "min-h-[50px]" : "min-h-[150px]",
            expanded && "scroll-soft max-h-[min(60vh,420px)] overflow-y-auto"
          )}
        >
          {messages.length === 0 && emptyHint ? (
            <p className="grid min-h-[inherit] place-items-center px-4 text-center text-sm text-muted-foreground">
              {emptyHint}
            </p>
          ) : (
            <ConversationLines
              participants={participants}
              messages={visibleMessages}
              characterColors={characterColors}
              showRealNames
            />
          )}
        </div>

        {/* Hint that older lines exist above the collapsed excerpt. */}
        {!expanded && hiddenCount > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card to-transparent"
          />
        )}
      </div>

      {/* Bottom section */}
      <div className="mt-auto flex items-center gap-2 border-t border-border bg-card/70 px-3 py-2.5 sm:px-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {/* No flip-rtl: these chevrons are vertical, and up/down is the
              same in every language. */}
          {expanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
          {expanded ? t("card.minimize") : t("card.fullChat")}
        </Button>

        {!isEnded && (onEndChat || showDisabledControls) && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={showDisabledControls}
            onClick={
              showDisabledControls ? undefined : () => setConfirmOpen(true)
            }
          >
            {/* flip-rtl: a door-and-arrow glyph reads as "out this way". */}
            <LogOut className="flip-rtl" />
            {t("endChat.confirm")}
          </Button>
        )}
      </div>

      {/* Only openable while the chat is live (the End chat button is the
          sole trigger), but kept mounted so closing isn't cut short when the
          card flips to ended. */}
      <EndChatConfirmationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmEnd}
        description={t("endChat.hostBody")}
        cancelLabel={t("endChat.hostCancel")}
      />
    </section>
  );
}
