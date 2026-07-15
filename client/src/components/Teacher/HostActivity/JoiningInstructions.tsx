import { useEffect, useRef, useState } from "react";
import { Link2, Megaphone } from "lucide-react";

import { useLocalePath } from "@/lib/locale";

import { CollapsibleSection } from "./CollapsibleSection";

/**
 * How students get in: the pin, said out loud or written on the board —
 * never a shared screen. This page shows who's waiting and who's paired
 * with whom, so projecting it would give the mystery away (the
 * no-projection principle; see DECISIONS.md).
 */
export function JoiningInstructions({ joinCode }: { joinCode: string }) {
  const localePath = useLocalePath();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const handleCopy = async () => {
    // The spoken instructions say www.chaverola.com (the address students
    // hear); the clipboard gets THIS origin, so the copied link opens the
    // real join page wherever the app is running. Never printed on screen.
    const url = `${window.location.origin}${localePath(`/activity/join/${joinCode}`)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions) — nothing to confirm.
    }
  };

  return (
    <CollapsibleSection
      title="Student joining instructions"
      icon={Megaphone}
      accent="sky"
      collapsedHint={`Pin ${joinCode} · students join at www.chaverola.com`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-2xl border-2 border-dashed border-brand-grape/40 bg-brand-grape-soft/50 px-8 py-4 text-center">
          <span className="block text-xs font-bold tracking-wide text-brand-grape-strong/80 uppercase">
            Activity pin
          </span>
          <span className="block text-4xl font-bold tracking-[0.2em] text-brand-grape-strong tabular-nums sm:text-5xl">
            {joinCode}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Tell your class:</p>
          <ol className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            <li>
              1. Go to{" "}
              <span className="font-semibold text-foreground">
                www.chaverola.com
              </span>
            </li>
            <li>
              2. Tap{" "}
              <span className="font-semibold text-foreground">
                Join an Activity
              </span>
            </li>
            <li>3. Type in the pin</li>
          </ol>
          <p className="mt-2.5 text-sm text-muted-foreground">
            Say the pin out loud or write it on the board. Keep your screen to
            yourself, because any student who sees your screen will know who
            they're about to chat with.
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-grape underline-offset-4 transition-colors hover:text-brand-grape-strong hover:underline"
          >
            <Link2 aria-hidden className="size-4" />
            {copied ? "Copied!" : "Copy the student join link"}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}
