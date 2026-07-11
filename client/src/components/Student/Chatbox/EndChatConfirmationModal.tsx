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
}

/** Confirmation step before ending the chat. */
export function EndChatConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
}: EndChatConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End this chat?</DialogTitle>
          <DialogDescription>
            You'll leave the conversation and head back to the lobby. You won't
            be able to return to this chat.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep chatting
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
