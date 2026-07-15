import { Archive } from "lucide-react";

import { ChatCard } from "@/components/Teacher/ChatCard";
import { withCurrentCharacters } from "@/lib/hostActivity";
import type { HostedActivity } from "@/types/activity";

import { CollapsibleSection } from "./CollapsibleSection";
import type { HostedChat } from "./useHostActivityDemo";

interface CompletedChatsSectionProps {
  chats: HostedChat[];
  activity: HostedActivity;
}

/**
 * Wrapped-up chats stay on the page in the muted card variant (no End chat
 * button, expand/minimize kept) so the teacher can reread what was said.
 */
export function CompletedChatsSection({
  chats,
  activity,
}: CompletedChatsSectionProps) {
  return (
    <CollapsibleSection
      title="Completed chats"
      icon={Archive}
      accent="sky"
      count={chats.length}
      collapsedHint={
        chats.length === 0
          ? "Ended chats land here"
          : `${chats.length} wrapped up. Expand any card to reread it`
      }
    >
      {chats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing here yet. Chats stick around after they end, so you can always
          look back at what was said.
        </p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {chats.map((chat) => (
            <ChatCard
              key={chat.id}
              participants={withCurrentCharacters(chat.participants, activity)}
              messages={chat.messages}
              isEnded
              inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
