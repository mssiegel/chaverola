import { Archive } from "lucide-react";

import { ChatCard } from "@/components/Teacher/ChatCard";
import { withCurrentCharacters } from "@/lib/hostActivity";
import type { HostedActivity } from "@/types/activity";

import { CollapsibleSection } from "./CollapsibleSection";
import { EmptyState } from "./EmptyState";
import type { HostedChat } from "./hostWorld";

interface CompletedChatsSectionProps {
  chats: HostedChat[];
  activity: HostedActivity;
  /** Shown in a card whose transcript is empty (live activities: the
   *  teacher transcript hasn't shipped, so every ended card is). Omit to
   *  render an empty feed — a demo card's transcript is never empty. */
  emptyHint?: string;
}

/**
 * Wrapped-up chats stay on the page in the muted card variant (no End chat
 * button, expand/minimize kept). Once teacher transcripts ship, this is
 * where the teacher rereads what was said.
 */
export function CompletedChatsSection({
  chats,
  activity,
  emptyHint,
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
          : `${chats.length} wrapped up`
      }
    >
      {chats.length === 0 ? (
        <EmptyState className="py-6">
          <p className="text-sm text-muted-foreground">
            Nothing here yet. When a chat ends, its card moves down here.
          </p>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {chats.map((chat) => (
            <ChatCard
              key={chat.id}
              participants={withCurrentCharacters(chat.participants, activity)}
              messages={chat.messages}
              isEnded
              emptyHint={emptyHint}
              inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
