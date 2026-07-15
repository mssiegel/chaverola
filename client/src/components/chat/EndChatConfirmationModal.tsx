import { LogOut } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EndChatConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** What ending the chat means from this viewer's seat. */
  description: string;
  /** Label for the "never mind" button. */
  cancelLabel: string;
}

/**
 * Confirmation step before ending a chat. Shared by the student and teacher
 * views — the consequences differ per seat, so each passes its own copy.
 */
export function EndChatConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  description,
  cancelLabel,
}: EndChatConfirmationModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="End this chat?"
      description={description}
      cancelLabel={cancelLabel}
      confirmLabel={
        <>
          <LogOut className="size-4" />
          End chat
        </>
      }
    />
  );
}
