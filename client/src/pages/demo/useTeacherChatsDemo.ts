import { useEffect, useState } from "react";

import type { MonitoredChat, TeacherChatScenario } from "@/types/chat";

const DRIP_INTERVAL_MS = 4000;

/**
 * The teacher demo "engine". Boots every scenario into a monitored chat, then
 * drips scripted lines into a random active chat on an interval so the grid
 * feels live. Ending a chat (or it having ended already) stops its drip.
 */
export function useTeacherChatsDemo(scenarios: TeacherChatScenario[]) {
  const [chats, setChats] = useState<MonitoredChat[]>(() =>
    scenarios.map((scenario) => ({
      id: scenario.id,
      participants: scenario.participants,
      status: scenario.status,
      messages: scenario.seedMessages.map((m, index) => ({
        id: `${scenario.id}-seed-${index}`,
        ...m,
      })),
    }))
  );

  useEffect(() => {
    const byId = new Map(scenarios.map((s) => [s.id, s]));

    const timer = setInterval(() => {
      // Roll outside the updater so the updater stays pure.
      const roll = Math.random();

      setChats((prev) => {
        const active = prev.filter(
          (chat) =>
            chat.status === "active" &&
            (byId.get(chat.id)?.upcomingLines.length ?? 0) > 0
        );
        if (active.length === 0) return prev;

        const target = active[Math.floor(roll * active.length)];
        const scenario = byId.get(target.id)!;
        // Lines dripped so far = messages beyond the seed. Loops the script.
        const dripped = target.messages.length - scenario.seedMessages.length;
        const line =
          scenario.upcomingLines[dripped % scenario.upcomingLines.length];

        return prev.map((chat) =>
          chat.id === target.id
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { id: `${chat.id}-live-${dripped}`, ...line },
                ],
              }
            : chat
        );
      });
    }, DRIP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [scenarios]);

  const endChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, status: "ended" } : chat
      )
    );
  };

  return { chats, endChat };
}
