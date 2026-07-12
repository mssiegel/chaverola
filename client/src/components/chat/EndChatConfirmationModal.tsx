import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End this chat?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <LogOut className="size-4" />
            End chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
