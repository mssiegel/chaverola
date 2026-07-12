import { Conversation } from "@/components/Student/Chatbox/Conversation";
import { MessageComposer } from "@/components/Student/Chatbox/MessageComposer";
import { useChatDemo } from "@/components/Student/Chatbox/useChatDemo";
import { assignCharacterColors } from "@/lib/characterColor";
import { heroChatScenario } from "@/mockData";

/**
 * The live sample chat on the homepage hero. It reuses the real student
 * chatbox pieces (conversation feed + composer) and the demo engine, so what
 * a visitor sees — and types into — is the actual product, minus the End
 * chat controls that don't belong on a landing page. See DECISIONS.md →
 * "Hero chatbox is a live demo".
 */
export function HeroChatbox() {
  const chat = useChatDemo(heroChatScenario);

  // Own character first so "you" (the Moon) are green — same rule as the app.
  const characterColors = assignCharacterColors([
    chat.self.character.id,
    ...chat.participants.map((p) => p.character.id),
  ]);

  const selfLabel = `${chat.self.character.name} ${chat.self.character.emoji}`;
  const peerLabel = chat.peers
    .map((peer) => `${peer.character.name} ${peer.character.emoji}`)
    .join(", ");

  return (
    <div className="flex h-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:h-[420px]">
      <header className="bg-gradient-to-r from-brand-grape to-brand-grape-strong px-4 py-3 leading-tight text-white">
        <div className="truncate text-[15px] font-semibold">
          <span className="font-normal text-white/70">You're </span>
          {selfLabel}
        </div>
        <div className="truncate text-sm text-white/85">
          <span className="text-white/60">with </span>
          {peerLabel}
          <span className="text-white/60"> · played by a classmate</span>
        </div>
      </header>

      <Conversation
        participants={chat.participants}
        selfId={chat.self.id}
        messages={chat.messages}
        typingPeerId={chat.typingPeerId}
        peerState={chat.peerState}
        offlinePeerId={chat.offlinePeerId}
        characterColors={characterColors}
      />

      <MessageComposer onSend={chat.send} selfCharacterLabel={selfLabel} />
    </div>
  );
}
