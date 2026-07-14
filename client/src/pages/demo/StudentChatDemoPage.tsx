import { useState } from "react";
import { XCircle } from "lucide-react";

import { ChatDemoControls } from "@/components/demo/ChatDemoControls";
import { EventButton, SegmentButton } from "@/components/demo/DemoControls";
import { DemoPageHeader } from "@/components/demo/DemoPageHeader";
import { Chatbox } from "@/components/Student/Chatbox";
import { useChatDemo } from "@/components/chat/useChatDemo";
import { useLocaleNavigate } from "@/lib/locale";
import {
  DEMO_JOIN_CODE,
  studentChatScenarios,
  type StudentChatScenarioKey,
} from "@/mockData";

/**
 * Temporary demo route (`/demo/student-chat`) that mounts the student chatbox
 * with a fully mocked, backend-free engine plus dev-only controls. This is
 * wired into the real student flow (`/activity/join/:joinCode`) in a later
 * prompt.
 */
export function StudentChatDemoPage() {
  const [scenarioKey, setScenarioKey] = useState<StudentChatScenarioKey>("duo");
  const [revealNames, setRevealNames] = useState(true);
  const scenario = studentChatScenarios[scenarioKey];
  const chat = useChatDemo(scenario);
  const navigate = useLocaleNavigate();

  const backToLobby = () => navigate(`/activity/join/${DEMO_JOIN_CODE}`);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <DemoPageHeader title="Student chatbox">
        A live preview with no backend. The peer replies on a timer, so try
        sending messages and emojis.
      </DemoPageHeader>

      <div className="h-[min(72vh,660px)]">
        <Chatbox
          chat={chat}
          revealNames={revealNames}
          onSend={chat.send}
          onEndChat={() => chat.endChat("student")}
          onBackToLobby={backToLobby}
        />
      </div>

      <ChatDemoControls
        chat={chat}
        revealNames={revealNames}
        onRevealNamesChange={setRevealNames}
        header={
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Scenario (switching restarts the chat)
            </p>
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              <SegmentButton
                active={scenarioKey === "duo"}
                onClick={() => setScenarioKey("duo")}
              >
                1:1 duo
              </SegmentButton>
              <SegmentButton
                active={scenarioKey === "group"}
                onClick={() => setScenarioKey("group")}
              >
                Group (3)
              </SegmentButton>
            </div>
          </div>
        }
        extraEvents={
          <EventButton
            onClick={() => chat.endChat("student")}
            disabled={chat.isEnded}
            icon={<XCircle className="size-4" />}
          >
            End chat
          </EventButton>
        }
      />
    </div>
  );
}
