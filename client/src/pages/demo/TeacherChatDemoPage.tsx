import { ChatCard } from "@/components/Teacher/ChatCard";
import { teacherChatScenarios } from "@/mockData";

import { useTeacherChatsDemo } from "./useTeacherChatsDemo";

/**
 * Temporary demo route (`/demo/teacher-chat`) that mounts the teacher chat
 * cards over a set of mocked chats that keep talking on their own. Wired into
 * the real teacher activity page (`/activity/host/:joinCode`) in a later
 * prompt.
 */
export function TeacherChatDemoPage() {
  const { chats, endChat } = useTeacherChatsDemo(teacherChatScenarios);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      <header className="text-center">
        <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-wide text-secondary-foreground uppercase">
          Temporary demo route
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Teacher chat cards
        </h1>
        <p className="text-sm text-muted-foreground">
          A live preview of what the teacher sees mid-round. The chats keep
          moving on their own, so expand a card to read everything or end one
          early.
        </p>
      </header>

      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {chats.map((chat) => (
          <ChatCard
            key={chat.id}
            participants={chat.participants}
            messages={chat.messages}
            isEnded={chat.status === "ended"}
            onEndChat={() => endChat(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}
