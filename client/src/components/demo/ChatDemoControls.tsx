import type { ReactNode } from "react";
import {
  FastForward,
  LogOut,
  MessageCirclePlus,
  Timer,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";

import type { ChatDemo } from "@/components/chat/useChatDemo";
import { cn } from "@/lib/utils";

import { DemoControlsPanel, DemoToggle, EventButton } from "./DemoControls";

interface ChatDemoControlsProps {
  chat: ChatDemo;
  /** True when the panel sits on the purple student world. */
  onWorld?: boolean;
  revealNames: boolean;
  onRevealNamesChange: (value: boolean) => void;
  /** Extra EventButtons after the built-in ones (pass them the same onWorld). */
  extraEvents?: ReactNode;
}

/**
 * The demo steering panel for a student-seat chat: the events a real backend
 * will push later (connection drops, a peer or the clock ending the chat)
 * plus the mocked "reveal names" setting, as visitor-friendly buttons. Used
 * by the join flow's chatting stage, which adds its own extras.
 */
export function ChatDemoControls({
  chat,
  onWorld = false,
  revealNames,
  onRevealNamesChange,
  extraEvents,
}: ChatDemoControlsProps) {
  const peerConnected = chat.peerState === "connected";

  return (
    <DemoControlsPanel
      onWorld={onWorld}
      caption="In a real chat these happen on their own."
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              onWorld ? "text-white/90" : "text-foreground"
            )}
          >
            Reveal names when chat ends
          </span>
          <DemoToggle checked={revealNames} onChange={onRevealNamesChange} />
        </label>

        <div>
          <p
            className={cn(
              "mb-1.5 text-xs font-medium",
              onWorld ? "text-white/80" : "text-muted-foreground"
            )}
          >
            Make something happen
          </p>
          <div className="grid grid-cols-2 gap-2">
            <EventButton
              onWorld={onWorld}
              onClick={chat.disconnectPeer}
              disabled={!peerConnected || chat.isEnded}
              icon={<WifiOff className="size-4" />}
            >
              Partner drops off
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.reconnectPeer}
              disabled={peerConnected || chat.isEnded}
              icon={<Wifi className="size-4" />}
            >
              Partner comes back
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.skipReconnectWait}
              disabled={chat.reconnectSecondsLeft === null || chat.isEnded}
              icon={<FastForward className="size-4" />}
            >
              Skip the wait
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.nudgePeer}
              disabled={!peerConnected || chat.isEnded}
              icon={<MessageCirclePlus className="size-4" />}
            >
              Make them talk
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.peerEndsChat}
              disabled={!peerConnected || chat.isEnded}
              icon={<LogOut className="size-4" />}
            >
              Partner ends chat
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={() => chat.endChat("self-timeout")}
              disabled={chat.isEnded}
              icon={<Unplug className="size-4" />}
            >
              You drop off (2 min pass)
            </EventButton>
            {/* Staged: first press jumps to the clock's final-minute state,
                a second press jumps to the expiry itself. */}
            <EventButton
              onWorld={onWorld}
              onClick={chat.skipAutoEndWait}
              disabled={chat.autoEndSecondsLeft === null || chat.isEnded}
              icon={<Timer className="size-4" />}
            >
              Fast-forward clock
            </EventButton>
            {extraEvents}
          </div>
        </div>
      </div>
    </DemoControlsPanel>
  );
}
