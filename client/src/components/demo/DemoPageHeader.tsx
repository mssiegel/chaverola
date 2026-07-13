import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

/**
 * Header for the temporary `/demo/*` pages: the "Temporary demo route" badge,
 * the page title, and a one-line intro.
 */
export function DemoPageHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="text-center">
      <Badge>Temporary demo route</Badge>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </header>
  );
}
