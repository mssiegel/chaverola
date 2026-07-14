import { useEffect, useState } from "react";
import {
  FastForward,
  GraduationCap,
  LogOut,
  MessageCirclePlus,
  TimerOff,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useChatDemo } from "@/components/chat/useChatDemo";
import {
  DemoControlsPanel,
  DemoToggle,
  EventButton,
} from "@/components/demo/DemoControls";
import { Chatbox } from "@/components/Student/Chatbox";
import { StudentIdentityBar } from "@/components/Student/StudentIdentityBar";
import { peerListLabel } from "@/lib/characterLabel";
import { useBackGuard } from "@/lib/useBackGuard";
import type { ChatDemo } from "@/components/chat/useChatDemo";
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
 * The chatting + chat-ended stages of the student flow: identity bar (the
 * lobby deliberately has none — see DECISIONS.md), the real chatbox driven by
 * the mock engine, and the dev-only event triggers. Mounted fresh per match
 * (the page keys it), so every match starts a clean chat.
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
  const chat = useChatDemo(scenario);

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
      <div className="flex w-full animate-in flex-col gap-3 duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
        <StudentIdentityBar
          name={studentName}
          stageLabel={
            chat.isEnded
              ? "Chat ended"
              : `Chatting with ${peerListLabel(chat.peers)}`
          }
          stageLive={!chat.isEnded}
        />
        <div className="h-[min(70dvh,620px)]">
          <Chatbox
            self={chat.self}
            peers={chat.peers}
            participants={chat.participants}
            messages={chat.messages}
            typingPeerId={chat.typingPeerId}
            peerState={chat.peerState}
            offlinePeerId={chat.offlinePeerId}
            reconnectSecondsLeft={chat.reconnectSecondsLeft}
            isEnded={chat.isEnded}
            endReason={chat.endReason}
            endedByPeerId={chat.endedByPeerId}
            revealNames={revealNames}
            onSend={chat.send}
            onEndChat={() => chat.endChat("student")}
            onBackToLobby={onBackToLobby}
            endConfirmOpen={confirmOpen}
            onEndConfirmOpenChange={setConfirmOpen}
          />
        </div>
      </div>

      <ChatStageDemoControls
        chat={chat}
        revealNames={revealNames}
        onRevealNamesChange={setRevealNames}
      />
    </>
  );
}

/**
 * Dev-only triggers for the mock events a real backend will push later:
 * connection drops, the teacher or the activity timer ending the chat, and a
 * fast-forward so the 2-minute reconnect window is testable without standing
 * around.
 */
function ChatStageDemoControls({
  chat,
  revealNames,
  onRevealNamesChange,
}: {
  chat: ChatDemo;
  revealNames: boolean;
  onRevealNamesChange: (value: boolean) => void;
}) {
  const peerConnected = chat.peerState === "connected";

  return (
    <DemoControlsPanel onWorld>
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/90">
            Reveal names when chat ends
          </span>
          <DemoToggle checked={revealNames} onChange={onRevealNamesChange} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <EventButton
            onWorld
            onClick={chat.disconnectPeer}
            disabled={!peerConnected || chat.isEnded}
            icon={<WifiOff className="size-4" />}
          >
            Peer drops
          </EventButton>
          <EventButton
            onWorld
            onClick={chat.reconnectPeer}
            disabled={peerConnected || chat.isEnded}
            icon={<Wifi className="size-4" />}
          >
            Peer reconnects
          </EventButton>
          <EventButton
            onWorld
            onClick={chat.skipReconnectWait}
            disabled={chat.reconnectSecondsLeft === null || chat.isEnded}
            icon={<FastForward className="size-4" />}
          >
            Skip the wait
          </EventButton>
          <EventButton
            onWorld
            onClick={chat.nudgePeer}
            disabled={!peerConnected || chat.isEnded}
            icon={<MessageCirclePlus className="size-4" />}
          >
            Make peer talk
          </EventButton>
          <EventButton
            onWorld
            onClick={chat.peerEndsChat}
            disabled={!peerConnected || chat.isEnded}
            icon={<LogOut className="size-4" />}
          >
            Peer ends chat
          </EventButton>
          <EventButton
            onWorld
            onClick={() => chat.endChat("self-timeout")}
            disabled={chat.isEnded}
            icon={<Unplug className="size-4" />}
          >
            You drop (2 min pass)
          </EventButton>
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
        </div>
      </div>
    </DemoControlsPanel>
  );
}
