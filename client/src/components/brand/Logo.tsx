import { cn } from "@/lib/utils";

interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number;
  /** Show the "Chaverola" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * The Chaverola mark: a rounded speech bubble with a friendly face (two dot
 * eyes + a small smile), tail at the bottom-left, on a rounded app-icon tile.
 * This is the single source of truth for the mark — it matches
 * `public/favicon.svg` and is reused for the navbar logo.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Chaverola"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="chaverola-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A6BFF" />
          <stop offset="1" stopColor="#6C4BE0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#chaverola-tile)" />
      <path d="M22 39 L14.5 51 L33 40 Z" fill="#ffffff" />
      <rect x="12" y="12.5" width="40" height="28" rx="11" fill="#ffffff" />
      <circle cx="26" cy="25.5" r="2.6" fill="#6C4BE0" />
      <circle cx="38" cy="25.5" r="2.6" fill="#6C4BE0" />
      <path
        d="M26 31.5 Q32 37 38 31.5"
        fill="none"
        stroke="#6C4BE0"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = 36, withWordmark = true, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Chaverola
        </span>
      )}
    </span>
  );
}
