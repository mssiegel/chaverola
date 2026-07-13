import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Card chrome shared by every chat surface. The student chatbox and the
 * homepage hero render it through <ChatFrame>; the teacher's ChatCard
 * composes the class itself to keep its <section> element and softer
 * elevation.
 */
export const CHAT_FRAME_CLASS =
  "flex flex-col overflow-hidden rounded-2xl border border-border bg-card";

export function ChatFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(CHAT_FRAME_CLASS, "shadow-xl", className)}>
      {children}
    </div>
  );
}
