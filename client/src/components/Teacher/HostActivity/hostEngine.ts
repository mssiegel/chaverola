import type { LobbyConnectionState } from "@chaverola/shared";

import type { HostedChat, WaitingStudent } from "./hostWorld";

/*
  The host page's engine contract — same pattern as ChatDemo extending
  ChatRoomState/ChatRoomActions. The dashboard renders any HostEngine;
  useHostActivityDemo implements it over the simulated classroom (plus its
  demo-only triggers, see HostDemoTriggers), and useHostActivityLive
  implements it over the real Socket.IO queue. Types only in this file so
  the live path never touches the simulation module.
*/

export interface HostEngine {
  waiting: WaitingStudent[];
  chatsInProgress: HostedChat[];
  completedChats: HostedChat[];
  studentsChattingCount: number;
  /** Character ids used by a live chat right now — their rows can't be removed. */
  characterIdsInUse: ReadonlySet<string>;
  leftoverStudentId: string | null;
  rematchNotice: string | null;
  dismissRematchNotice: () => void;
  /** True when this exact group was everyone's previous chat. */
  isExactRematch: (ids: string[]) => boolean;
  startChat: (studentIds: string[]) => void;
  pairEveryone: () => void;
  endChat: (chatId: string) => void;
  endAllChats: () => void;
  /** The teacher's world-level pause — never per chat. */
  paused: boolean;
  pauseAllChats: () => void;
  resumeAllChats: () => void;
  removeFromQueue: (studentId: string) => void;
  removeFromChat: (chatId: string, studentId: string) => void;
  /** The teacher's own link to the class. The demo is always "connected";
   *  the live page goes amber (banner + dimmed queue) while "reconnecting". */
  connection: LobbyConnectionState;
}

/** The demo steering panel's triggers — demo engine only, never live. */
export interface HostDemoTriggers {
  /** A student joins right now. */
  triggerJoin: () => void;
  canTriggerJoin: boolean;
  /** Fast-forward every live clock (finale, then expiry). */
  fastForwardClocks: () => void;
  /** A random waiting student drops and comes back — the lost-connection row. */
  triggerWifiBlip: () => void;
  canTriggerWifiBlip: boolean;
}
