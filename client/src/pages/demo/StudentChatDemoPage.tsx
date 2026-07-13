import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCirclePlus,
  Wifi,
  WifiOff,
  Wrench,
  XCircle,
} from "lucide-react";

import { Chatbox } from "@/components/Student/Chatbox";
import { useChatDemo } from "@/components/chat/useChatDemo";
import { cn } from "@/lib/utils";
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
      <header className="text-center">
        <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-wide text-secondary-foreground uppercase">
          Temporary demo route
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Student chatbox
        </h1>
        <p className="text-sm text-muted-foreground">
          A live preview with no backend. The peer replies on a timer, so try
          sending messages and emojis.
        </p>
      </header>

      <div className="h-[min(72vh,660px)]">
        <Chatbox
          self={chat.self}
          peers={chat.peers}
          participants={chat.participants}
          messages={chat.messages}
          typingPeerId={chat.typingPeerId}
          peerState={chat.peerState}
          offlinePeerId={chat.offlinePeerId}
          isEnded={chat.isEnded}
          revealNames={revealNames}
          onSend={chat.send}
          onEndChat={chat.endChat}
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
        onDisconnect={chat.disconnectPeer}
        onReconnect={chat.reconnectPeer}
        onNudge={chat.nudgePeer}
        onEndChat={chat.endChat}
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
  onDisconnect: () => void;
  onReconnect: () => void;
  onNudge: () => void;
  onEndChat: () => void;
}

function DemoControls({
  scenarioKey,
  onScenarioChange,
  revealNames,
  onRevealNamesChange,
  peerConnected,
  isEnded,
  onDisconnect,
  onReconnect,
  onNudge,
  onEndChat,
}: DemoControlsProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Wrench className="size-4" />
        Demo controls
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
          dev only
        </span>
      </div>

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
          <Toggle checked={revealNames} onChange={onRevealNamesChange} />
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
              onClick={onNudge}
              disabled={!peerConnected || isEnded}
              icon={<MessageCirclePlus className="size-4" />}
            >
              Poke peer
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
    </section>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EventButton({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
    >
      {icon}
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
