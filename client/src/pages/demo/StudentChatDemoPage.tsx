import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FastForward,
  LogOut,
  MessageCirclePlus,
  Unplug,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

import {
  DemoControlsPanel,
  DemoToggle,
  EventButton,
  SegmentButton,
} from "@/components/demo/DemoControls";
import { DemoPageHeader } from "@/components/demo/DemoPageHeader";
import { Chatbox } from "@/components/Student/Chatbox";
import { useChatDemo } from "@/components/chat/useChatDemo";
import { useLocalePath } from "@/lib/locale";
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
  const navigate = useNavigate();
  const localePath = useLocalePath();

  const backToLobby = () =>
    navigate(localePath(`/activity/join/${DEMO_JOIN_CODE}`));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <DemoPageHeader title="Student chatbox">
        A live preview with no backend. The peer replies on a timer, so try
        sending messages and emojis.
      </DemoPageHeader>

      <div className="h-[min(72vh,660px)]">
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
          onBackToLobby={backToLobby}
        />
      </div>

      <DemoControls
        scenarioKey={scenarioKey}
        onScenarioChange={setScenarioKey}
        revealNames={revealNames}
        onRevealNamesChange={setRevealNames}
        peerConnected={chat.peerState === "connected"}
        isEnded={chat.isEnded}
        canSkipWait={chat.reconnectSecondsLeft !== null}
        onDisconnect={chat.disconnectPeer}
        onReconnect={chat.reconnectPeer}
        onSkipWait={chat.skipReconnectWait}
        onNudge={chat.nudgePeer}
        onPeerEndsChat={chat.peerEndsChat}
        onSelfTimeout={() => chat.endChat("self-timeout")}
        onEndChat={() => chat.endChat("student")}
      />
    </div>
  );
}

interface DemoControlsProps {
  scenarioKey: StudentChatScenarioKey;
  onScenarioChange: (key: StudentChatScenarioKey) => void;
  revealNames: boolean;
  onRevealNamesChange: (value: boolean) => void;
  peerConnected: boolean;
  isEnded: boolean;
  canSkipWait: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
  onSkipWait: () => void;
  onNudge: () => void;
  onPeerEndsChat: () => void;
  onSelfTimeout: () => void;
  onEndChat: () => void;
}

function DemoControls({
  scenarioKey,
  onScenarioChange,
  revealNames,
  onRevealNamesChange,
  peerConnected,
  isEnded,
  canSkipWait,
  onDisconnect,
  onReconnect,
  onSkipWait,
  onNudge,
  onPeerEndsChat,
  onSelfTimeout,
  onEndChat,
}: DemoControlsProps) {
  return (
    <DemoControlsPanel>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Scenario (switching restarts the chat)
          </p>
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            <SegmentButton
              active={scenarioKey === "duo"}
              onClick={() => onScenarioChange("duo")}
            >
              1:1 duo
            </SegmentButton>
            <SegmentButton
              active={scenarioKey === "group"}
              onClick={() => onScenarioChange("group")}
            >
              Group (3)
            </SegmentButton>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            Reveal names when chat ends
          </span>
          <DemoToggle checked={revealNames} onChange={onRevealNamesChange} />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Trigger events
          </p>
          <div className="grid grid-cols-2 gap-2">
            <EventButton
              onClick={onDisconnect}
              disabled={!peerConnected || isEnded}
              icon={<WifiOff className="size-4" />}
            >
              Peer drops
            </EventButton>
            <EventButton
              onClick={onReconnect}
              disabled={peerConnected || isEnded}
              icon={<Wifi className="size-4" />}
            >
              Peer reconnects
            </EventButton>
            <EventButton
              onClick={onSkipWait}
              disabled={!canSkipWait || isEnded}
              icon={<FastForward className="size-4" />}
            >
              Skip the wait
            </EventButton>
            <EventButton
              onClick={onNudge}
              disabled={!peerConnected || isEnded}
              icon={<MessageCirclePlus className="size-4" />}
            >
              Make peer talk
            </EventButton>
            <EventButton
              onClick={onPeerEndsChat}
              disabled={!peerConnected || isEnded}
              icon={<LogOut className="size-4" />}
            >
              Peer ends chat
            </EventButton>
            <EventButton
              onClick={onSelfTimeout}
              disabled={isEnded}
              icon={<Unplug className="size-4" />}
            >
              You drop (2 min pass)
            </EventButton>
            <EventButton
              onClick={onEndChat}
              disabled={isEnded}
              icon={<XCircle className="size-4" />}
            >
              End chat
            </EventButton>
          </div>
        </div>
      </div>
    </DemoControlsPanel>
  );
}
