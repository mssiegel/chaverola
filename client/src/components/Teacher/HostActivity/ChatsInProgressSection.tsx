import { LogOut, MessagesSquare, UsersRound } from "lucide-react";

import { ChatCard } from "@/components/Teacher/ChatCard";
import { Button } from "@/components/ui/button";
import { withCurrentCharacters } from "@/lib/hostActivity";
import type { HostedActivity } from "@/types/activity";
import type { Participant } from "@/types/chat";

import { CollapsibleSection } from "./CollapsibleSection";
import { EmptyState } from "./EmptyState";
import type { HostedChat } from "./hostWorld";

interface ChatsInProgressSectionProps {
  chats: HostedChat[];
  activity: HostedActivity;
  studentsChattingCount: number;
  waitingCount: number;
  onEndChat: (chatId: string) => void;
  onRequestEndAll: () => void;
  onRequestRemoveParticipant: (
    chat: HostedChat,
    participant: Participant
  ) => void;
  onPairEveryone: () => void;
}

/**
 * The live chats, one teacher chat card each — last 5 lines, expandable,
 * per-chat end with its own confirmation, the chat's remaining time when
 * auto-end is on, and a per-participant remove control (quiet exit; see
 * DECISIONS.md). "End all chats" is the round-closer and confirms first.
 */
export function ChatsInProgressSection({
  chats,
  activity,
  studentsChattingCount,
  waitingCount,
  onEndChat,
  onRequestEndAll,
  onRequestRemoveParticipant,
  onPairEveryone,
}: ChatsInProgressSectionProps) {
  return (
    <CollapsibleSection
      title="Chats in progress"
      icon={MessagesSquare}
      accent="coral"
      count={chats.length}
      collapsedHint={
        chats.length === 0
          ? "No chats going right now"
          : `${studentsChattingCount} students chatting right now`
      }
    >
      {chats.length === 0 ? (
        <EmptyState className="py-8">
          <p className="font-semibold text-foreground">No chats yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Pair two students in the queue, or start the whole round in one tap.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={onPairEveryone}
            disabled={waitingCount < 2}
          >
            <UsersRound aria-hidden />
            Pair everyone 1:1
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {studentsChattingCount}
              </span>{" "}
              students chatting
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestEndAll}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut aria-hidden />
              End all chats
            </Button>
          </div>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {chats.map((chat) => (
              <ChatCard
                key={chat.id}
                // Labels resolve against the CURRENT roster, so a live
                // rename re-labels every card instantly.
                participants={withCurrentCharacters(
                  chat.participants,
                  activity
                )}
                messages={chat.messages}
                isEnded={false}
                onEndChat={() => onEndChat(chat.id)}
                autoEndSecondsLeft={chat.autoEndSecondsLeft}
                inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
                onRemoveParticipant={(participant) =>
                  onRequestRemoveParticipant(chat, participant)
                }
              />
            ))}
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
