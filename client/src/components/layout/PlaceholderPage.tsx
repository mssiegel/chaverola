import type { ReactNode } from "react";

interface PlaceholderPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * A consistent stub for routes that aren't built out yet. Keeps every route
 * alive (never a dead end) with a clear title and navigation.
 */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-4 py-12 text-center">
      {eyebrow && (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-wide text-secondary-foreground uppercase">
          {eyebrow}
        </span>
      )}
      <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
      {description && (
        <p className="text-balance text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}
