import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  /** May include an icon next to the text (e.g. the End chat log-out icon). */
  confirmLabel: ReactNode;
  cancelLabel: string;
  /**
   * Destructive by default — most confirmations here end or remove things.
   * Reversible actions (pausing the class) confirm in the default color so
   * the button doesn't read as a warning.
   */
  confirmVariant?: "default" | "destructive";
}

/**
 * The app's one confirmation dialog: outline "never mind" + a confirm
 * button. Every confirm step (ending a chat, removing a student, ending
 * every chat at once, pausing the class) renders through this so they all
 * read the same.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "destructive",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
