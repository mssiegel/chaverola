import { useEffect, useState } from "react";
import { GraduationCap, TimerOff } from "lucide-react";

import { useChatDemo } from "@/components/chat/useChatDemo";
import { ChatDemoControls } from "@/components/demo/ChatDemoControls";
import { EventButton } from "@/components/demo/DemoControls";
import { Chatbox } from "@/components/Student/Chatbox";
import { DEFAULT_ACTIVITY_SETTINGS } from "@/lib/activitySetup";
import { useBackGuard } from "@/lib/useBackGuard";
import {
  activityChatScenarios,
  type ActivityChatScenarioKey,
} from "@/mockData";

interface ChatStageProps {
  /** The real name the student signed in with. */
  studentName: string;
  /** Which mock match the lobby's demo trigger fired (1:1 or group of 3). */
  scenarioKey: ActivityChatScenarioKey;
  /** Reports the chat ending / restarting so the page can derive its stage. */
  onEndedChange: (ended: boolean) => void;
  onBackToLobby: () => void;
}

/**
 * The chatting + chat-ended stages of the student flow: the real chatbox
 * driven by the mock engine, plus the demo steering panel. Mounted fresh
 * per match (the page keys it), so every match starts a clean chat. No
 * identity bar here — the chat header already says who you're with (see
 * DECISIONS.md).
 */
export function ChatStage({
  studentName,
  scenarioKey,
  onEndedChange,
  onBackToLobby,
}: ChatStageProps) {
  // Built once per mount: the scenario is this match's identity, with the
  // signed-in student's real name behind their character.
  const [scenario] = useState(() => {
    const base = activityChatScenarios[scenarioKey];
    return { ...base, self: { ...base.self, realName: studentName } };
  });
  // The demo activity runs the recommended settings, so this chat carries the
  // default auto-end clock (both tabs stay independently mocked — there's no
  // cross-tab sync with a teacher's live settings).
  const chat = useChatDemo(scenario, {
    autoEndSeconds: DEFAULT_ACTIVITY_SETTINGS.autoEndMinutes * 60,
  });

  // Mock of the teacher's activity-level "reveal names" setting, until the
  // teacher host page owns it for real.
  const [revealNames, setRevealNames] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    onEndedChange(chat.isEnded);
  }, [chat.isEnded, onEndedChange]);

  // A stray back-swipe must never silently kill a live chat: back opens the
  // same end-chat confirmation as the End chat button (see DECISIONS.md).
  useBackGuard(!chat.isEnded, () => setConfirmOpen(true));

  return (
    <>
      <div className="h-[min(70dvh,620px)] w-full animate-in duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
        <Chatbox
          chat={chat}
          revealNames={revealNames}
          onSend={chat.send}
          onEndChat={() => chat.endChat("student")}
          onBackToLobby={onBackToLobby}
          endConfirmOpen={confirmOpen}
          onEndConfirmOpenChange={setConfirmOpen}
        />
      </div>

      {/* The join flow's extra triggers: end sources that exist only once a
          teacher and an activity clock are in the room. */}
      <ChatDemoControls
        chat={chat}
        onWorld
        revealNames={revealNames}
        onRevealNamesChange={setRevealNames}
        extraEvents={
          <>
            <EventButton
              onWorld
              onClick={() => chat.endChat("teacher")}
              disabled={chat.isEnded}
              icon={<GraduationCap className="size-4" />}
            >
              Teacher ends chat
            </EventButton>
            <EventButton
              onWorld
              onClick={() => chat.endChat("timer")}
              disabled={chat.isEnded}
              icon={<TimerOff className="size-4" />}
            >
              Auto-end timer fires
            </EventButton>
          </>
        }
      />
    </>
  );
}
