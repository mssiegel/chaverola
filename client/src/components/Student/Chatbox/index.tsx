import { useState } from "react";
import { LogOut } from "lucide-react";

import { AutoEndCountdown } from "@/components/chat/AutoEndCountdown";
import { ChatFrame } from "@/components/chat/ChatFrame";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Conversation } from "@/components/chat/Conversation";
import { EndChatConfirmationModal } from "@/components/chat/EndChatConfirmationModal";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { characterLabel } from "@/lib/characterLabel";
import { selfFirstCharacterColors } from "@/lib/characterColor";
import type { ChatRoomState } from "@/types/chat";

import { ChatEndedSection } from "./ChatEndedSection";

export interface ChatboxProps {
  /** The room, exactly as the engine reports it. */
  chat: ChatRoomState;
  /** Teacher's "reveal names" setting (mocked in the demo). */
  revealNames: boolean;
  onSend: (text: string) => void;
  onEndChat: () => void;
  onBackToLobby: () => void;
  /**
   * Optional external control of the end-chat confirm dialog — the join
   * flow's back-swipe guard opens it from outside. Pass both or neither;
   * when absent the dialog manages itself.
   */
  endConfirmOpen?: boolean;
  onEndConfirmOpenChange?: (open: boolean) => void;
}

/**
 * The student chatbox shell. Presentational: it's driven entirely by props —
 * the room state as one plain-data object (ChatRoomState) plus the actions
 * its parent mediates — so the same component can later be fed by a real
 * data source. Follows the shared layout: header → conversation → bottom
 * section (message input, or the chat-ended panel once the chat is over).
 */
export function Chatbox({
  chat,
  revealNames,
  onSend,
  onEndChat,
  onBackToLobby,
  endConfirmOpen,
  onEndConfirmOpenChange,
}: ChatboxProps) {
  const {
    self,
    peers,
    participants,
    messages,
    typingPeerId,
    peerState,
    offlinePeerId,
    reconnectSecondsLeft,
    autoEndSecondsLeft,
    isEnded,
    endReason,
    endedByPeerId,
  } = chat;
  const [internalConfirmOpen, setInternalConfirmOpen] = useState(false);
  const confirmOpen = endConfirmOpen ?? internalConfirmOpen;
  const setConfirmOpen = onEndConfirmOpenChange ?? setInternalConfirmOpen;

  // Color per speaker, assigned by order — "you" are always green. Shared by
  // the feed + the end-of-chat reveal.
  const characterColors = selfFirstCharacterColors(self, participants);

  // The reveal lists everyone the student actually chatted with, including a
  // group member who got dropped along the way — their lines are still in the
  // transcript, so their mystery deserves an answer too.
  const everPeers = participants.filter((p) => p.id !== self.id);

  const handleConfirmEnd = () => {
    setConfirmOpen(false);
    onEndChat();
  };

  return (
    <ChatFrame className="h-full">
      <ChatHeader
        self={self}
        peers={peers}
        characterColors={characterColors}
        actions={
          !isEnded && (
            <div className="flex shrink-0 items-center gap-2">
              {autoEndSecondsLeft !== null && (
                <AutoEndCountdown secondsLeft={autoEndSecondsLeft} onDark />
              )}
              {/* On narrow widths the pill compresses to icon + "End" so the
                  clock fits without crowding the header. */}
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label="End chat"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-[0.98]"
              >
                <LogOut className="size-4" />
                <span className="max-sm:hidden">End chat</span>
                <span aria-hidden className="sm:hidden">
                  End
                </span>
              </button>
            </div>
          )
        }
      />

      {/* Conversation */}
      <Conversation
        participants={participants}
        selfId={self.id}
        messages={messages}
        typingPeerId={isEnded ? null : typingPeerId}
        peerState={isEnded ? "connected" : peerState}
        offlinePeerId={offlinePeerId}
        reconnectSecondsLeft={reconnectSecondsLeft}
        characterColors={characterColors}
      />

      {/* Bottom section */}
      {isEnded ? (
        <ChatEndedSection
          peers={everPeers}
          revealNames={revealNames}
          characterColors={characterColors}
          endReason={endReason}
          endedByPeerId={endedByPeerId}
          endedInGroup={peers.length > 1}
          onBackToLobby={onBackToLobby}
        />
      ) : (
        <MessageComposer
          onSend={onSend}
          selfCharacterLabel={characterLabel(self)}
        />
      )}

      <EndChatConfirmationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmEnd}
        description="This ends the chat for everyone in it, and there's no reopening it. You can head back to the lobby whenever you're ready."
        cancelLabel="Keep chatting"
      />
    </ChatFrame>
  );
}
