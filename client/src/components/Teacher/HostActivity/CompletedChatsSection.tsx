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
}

/**
 * Wrapped-up chats stay on the page in the muted card variant (no End chat
 * button, expand/minimize kept). This is where the teacher rereads what was
 * said — the full transcript rides every card.
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
              // A real empty state: a chat can end before its first message
              // (the below-2 rule), and the blank box needs to say so.
              emptyHint="This chat ended before anyone said anything."
              inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
