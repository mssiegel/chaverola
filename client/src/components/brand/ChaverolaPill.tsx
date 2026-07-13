import { cn } from "@/lib/utils";

/**
 * The floating "Chaverola" badge that crowns the student world (see
 * StudentWorldLayout). Gradient stops come from the `--brand-gradient-*`
 * tokens in index.css — the source of truth for the brand-mark gradient.
 * Not a link itself; the layout wraps it in a LocaleLink home.
 */
export function ChaverolaPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-linear-to-b from-brand-gradient-from to-brand-gradient-to px-5 py-2 shadow-lg ring-1 ring-white/25",
        className
      )}
    >
      <span className="text-xl font-semibold tracking-wide text-white">
        Chaverola
      </span>
    </span>
  );
}
