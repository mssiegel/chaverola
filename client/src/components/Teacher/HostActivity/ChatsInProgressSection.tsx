import { LogOut, MessagesSquare, Pause, Play, UsersRound } from "lucide-react";

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
  /** The activity-wide pause; pausing confirms, resuming is one tap. */
  paused: boolean;
  onRequestPauseAll: () => void;
  onResumeAll: () => void;
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
  paused,
  onRequestPauseAll,
  onResumeAll,
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
          : paused
            ? `Paused: ${studentsChattingCount} students mid-chat`
            : `${studentsChattingCount} students chatting right now`
      }
    >
      {chats.length === 0 ? (
        // A paused room can empty out chat by chat (per-chat ends don't
        // clear the pause), so Resume must stay reachable here too.
        paused ? (
          <EmptyState className="py-8">
            <p className="font-semibold text-foreground">Still paused</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              The chats are over, but the class is still paused. Nobody gets
              matched again until you resume.
            </p>
            <Button className="mt-4" onClick={onResumeAll}>
              <Play aria-hidden />
              Resume
            </Button>
          </EmptyState>
        ) : (
          <EmptyState className="py-8">
            <p className="font-semibold text-foreground">No chats yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Pair two students in the queue, or start the whole round in one
              tap.
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
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {studentsChattingCount}
              </span>{" "}
              students chatting
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {paused ? (
                <Button size="sm" onClick={onResumeAll}>
                  <Play aria-hidden />
                  Resume
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRequestPauseAll}
                  className="border-amber-400/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                >
                  <Pause aria-hidden />
                  Pause all chats
                </Button>
              )}
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
          </div>
          {paused && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
            >
              <Pause aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                Chats are paused. Students can read their chat but can't type
                until you resume.
              </span>
            </div>
          )}
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
                isPaused={paused}
                onEndChat={() => onEndChat(chat.id)}
                autoEndSecondsLeft={chat.autoEndSecondsLeft}
                elapsedSeconds={chat.elapsedSeconds ?? null}
                // A real empty state, not a feature notice: transcripts are
                // live, so a silent card just hasn't had its first message.
                // Unconditional — on a freshly paired demo chat it shows for
                // a beat until the first scripted line, and it's just as
                // true there.
                emptyHint="No messages yet. They'll show up here as students type."
                inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
                reconnectingParticipantIds={
                  new Set(chat.reconnectingStudentIds ?? [])
                }
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
