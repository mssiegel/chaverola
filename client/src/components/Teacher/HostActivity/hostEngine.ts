import type { ActivitySettings, LobbyConnectionState } from "@chaverola/shared";

import type { HostedChat, WaitingStudent } from "./hostWorld";

/*
  The host page's engine contract — same pattern as ChatDemo extending
  ChatRoomState/ChatRoomActions. The dashboard renders any HostEngine;
  useHostActivityDemo implements it over the simulated classroom (plus its
  demo-only triggers, see HostDemoTriggers), and useHostActivityLive
  implements it over the real Socket.IO queue. Types only in this file so
  the live path never touches the simulation module.
*/

/** The wrapped-up state after a teacher ends the activity — null while live.
 *  `to` is the email destination (null when none was set); `state` is the
 *  send's progress, where "empty" means there was nothing to send. */
export interface HostEnded {
  to: string | null;
  state: "sending" | "sent" | "failed" | "empty";
}

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
  /** Push a settings change to the engine's world. The live engine emits it
   *  to the server (settings sync is real); the demo's world reads
   *  activity.settings directly, so its engine no-ops. */
  updateSettings: (settings: ActivitySettings) => void;
  /** Where this activity's transcripts get emailed — null clears it. The live
   *  engine sends it to the server (the send happens there, long after this
   *  tab may be gone); the demo's world reads activity.teacherEmail directly,
   *  so its engine no-ops, exactly like updateSettings. */
  updateTeacherEmail: (email: string | null) => void;
  /** The teacher's own link to the class. The demo is always "connected";
   *  the live page goes amber (banner + dimmed queue) while "reconnecting". */
  connection: LobbyConnectionState;
  /** End the whole activity: every chat ends, the transcript is emailed, and
   *  the activity is torn down. `teacherEmail` is the send destination the
   *  wrapped-up card shows optimistically (the live engine settles it against
   *  the server's result; the demo settles it locally). */
  endActivity: (teacherEmail: string | null) => void;
  /** null while the activity is live; set once the teacher ends it, driving
   *  the wrapped-up screen. See HostEnded. */
  ended: HostEnded | null;
}

/** The demo steering panel's triggers — demo engine only, never live. */
export interface HostDemoTriggers {
  /** A student joins right now. */
  triggerJoin: () => void;
  canTriggerJoin: boolean;
  /** A random waiting student drops and comes back — the lost-connection row. */
  triggerWifiBlip: () => void;
  canTriggerWifiBlip: boolean;
}
