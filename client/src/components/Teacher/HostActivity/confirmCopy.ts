import type { Participant } from "@/types/chat";

import type { HostedChat, WaitingStudent } from "./hostWorld";

/** The confirmations the host page can be waiting on. */
export type PendingAction =
  | { kind: "remove-from-queue"; student: WaitingStudent }
  | { kind: "remove-from-chat"; chat: HostedChat; participant: Participant }
  | { kind: "end-all" }
  | { kind: "pause-all" }
  | { kind: "end-activity" };

/**
 * The confirmation copy per action — each names what actually happens.
 * `autoMatchOn` is read live at render, never frozen into the action: a
 * pending settings edit can flip it while the dialog is open, and the copy
 * must not promise a hold that won't happen.
 */
export function confirmCopy(
  action: PendingAction | null,
  autoMatchOn: boolean,
  teacherEmail: string | null,
  chatCount: number,
  demo: boolean
): {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Pause is reversible, so it confirms in the default color, not red. */
  confirmVariant: "default" | "destructive";
} {
  if (action?.kind === "remove-from-queue") {
    return {
      title: `Remove ${action.student.realName}?`,
      description:
        "They'll be signed out and sent back to the join screen, with a note that you removed them. They can sign in again, with a better name if that was the problem.",
      confirmLabel: "Remove them",
      cancelLabel: "Never mind",
      confirmVariant: "destructive",
    };
  }
  if (action?.kind === "remove-from-chat") {
    const groupChat =
      action.chat.participants.length - action.chat.inactiveStudentIds.length >
      2;
    return {
      title: `Remove ${action.participant.realName} from their chat?`,
      description: groupChat
        ? "They'll be signed out and sent back to the join screen. The rest of the group keeps chatting, and classmates only see that the character left, not that you removed anyone."
        : "They'll be signed out and sent back to the join screen, and their partner's chat ends. Nobody is told it was a removal.",
      confirmLabel: "Remove them",
      cancelLabel: "Never mind",
      confirmVariant: "destructive",
    };
  }
  if (action?.kind === "pause-all") {
    return {
      title: "Pause all chats?",
      description:
        "Students keep their chat on screen but can't send anything until you resume. Chat clocks stop too, so nobody loses time.",
      confirmLabel: "Pause chats",
      cancelLabel: "Never mind",
      confirmVariant: "default",
    };
  }
  if (action?.kind === "end-activity") {
    // The terminal wrap-up. Names the three consequences, then where the
    // transcript goes (with a live chat count) or that nothing will be sent.
    const consequences =
      "Every chat ends right now and your students see the activity is over. The join code stops working, so nobody else can join.";
    const emailLine = demo
      ? "This is the demo, so nothing gets emailed."
      : !teacherEmail
        ? "No email is set, so nothing will be emailed. The chats will only be here on this page."
        : chatCount === 0
          ? `No chats have happened yet, so there's nothing to email to ${teacherEmail}.`
          : chatCount === 1
            ? `We'll email the chat to ${teacherEmail}.`
            : `We'll email all ${chatCount} chats to ${teacherEmail}.`;
    return {
      title: "End the activity for everyone?",
      description: `${consequences} ${emailLine}`,
      confirmLabel: "End activity",
      cancelLabel: "Keep it running",
      confirmVariant: "destructive",
    };
  }
  return {
    title: "End all chats?",
    description: autoMatchOn
      ? "Every active chat will end right now for everyone in it. Auto-match goes on hold too, so students wait in the lobby until you pair them or turn it back on."
      : "Every active chat will end right now for everyone in it. Students will see the chat is over and can head back to the lobby for another round.",
    confirmLabel: "End all chats",
    cancelLabel: "Let them keep chatting",
    confirmVariant: "destructive",
  };
}
