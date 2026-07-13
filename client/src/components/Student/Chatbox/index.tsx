import { useState } from "react";
import { LogOut } from "lucide-react";

import { ChatFrame } from "@/components/chat/ChatFrame";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { EndChatConfirmationModal } from "@/components/chat/EndChatConfirmationModal";
import { characterLabel } from "@/lib/characterLabel";
import { selfFirstCharacterColors } from "@/lib/characterColor";
import type {
  ChatMessage,
  Participant,
  PeerConnectionState,
} from "@/types/chat";

import { ChatEndedSection } from "./ChatEndedSection";
import { Conversation } from "./Conversation";
import { MessageComposer } from "./MessageComposer";

export interface ChatboxProps {
  self: Participant;
  peers: Participant[];
  participants: Participant[];
  messages: ChatMessage[];
  typingPeerId: string | null;
  peerState: PeerConnectionState;
  offlinePeerId: string | null;
  isEnded: boolean;
  /** Teacher's "reveal names" setting (mocked in the demo). */
  revealNames: boolean;
  onSend: (text: string) => void;
  onEndChat: () => void;
  onBackToLobby: () => void;
}

/**
 * The student chatbox shell. Presentational: it's driven entirely by props so
 * the same component can later be fed by a real data source. Follows the shared
 * layout: header → conversation → bottom section (message input, or the
 * chat-ended panel once the chat is over).
 */
export function Chatbox({
  self,
  peers,
  participants,
  messages,
  typingPeerId,
  peerState,
  offlinePeerId,
  isEnded,
  revealNames,
  onSend,
  onEndChat,
  onBackToLobby,
}: ChatboxProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Color per speaker, assigned by order — "you" are always green. Shared by
  // the feed + the end-of-chat reveal.
  const characterColors = selfFirstCharacterColors(self, participants);

  const handleConfirmEnd = () => {
    setConfirmOpen(false);
    onEndChat();
  };

  return (
    <ChatFrame className="h-full">
      <ChatHeader
        self={self}
        peers={peers}
        actions={
          !isEnded && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-[0.98]"
            >
              <LogOut className="size-4" />
              <span>End chat</span>
            </button>
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
        characterColors={characterColors}
      />

      {/* Bottom section */}
      {isEnded ? (
        <ChatEndedSection
          peers={peers}
          revealNames={revealNames}
          characterColors={characterColors}
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
