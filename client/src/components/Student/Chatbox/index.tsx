import { useState } from "react";
import { LogOut } from "lucide-react";

import { EndChatConfirmationModal } from "@/components/chat/EndChatConfirmationModal";
import { assignCharacterColors } from "@/lib/characterColor";
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

  // Color per speaker, assigned by order. Seed the student's own character
  // first so "you" are always green; peers then follow (golden, bluish,
  // purplish, …). Shared by the feed + the end-of-chat reveal.
  const characterColors = assignCharacterColors([
    self.character.id,
    ...participants.map((p) => p.character.id),
  ]);

  const peerLabel = peers
    .map((peer) => `${peer.character.name} ${peer.character.emoji}`)
    .join(", ");

  const handleConfirmEnd = () => {
    setConfirmOpen(false);
    onEndChat();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-grape to-brand-grape-strong px-4 py-3 text-white">
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-semibold">
            <span className="font-normal text-white/70">You're </span>
            {self.character.name} {self.character.emoji}
          </div>
          <div className="truncate text-sm text-white/85">
            <span className="text-white/60">with </span>
            {peerLabel}
          </div>
        </div>

        {!isEnded && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-[0.98]"
          >
            <LogOut className="size-4" />
            <span>End chat</span>
          </button>
        )}
      </header>

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
          selfCharacterLabel={`${self.character.name} ${self.character.emoji}`}
        />
      )}

      <EndChatConfirmationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmEnd}
        description="This ends the chat for everyone in it, and there's no reopening it. You can head back to the lobby whenever you're ready."
        cancelLabel="Keep chatting"
      />
    </div>
  );
}

export default Chatbox;
