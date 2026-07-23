import { Loader2 } from "lucide-react";

import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";

import type { HostEnded } from "./hostEngine";

/**
 * The screen a teacher lands on after ending the activity. It replaces the live
 * dashboard (the class is over) and reports the transcript email's fate — sent,
 * failed, or nothing to send — with the completed chats still readable beneath
 * it (rendered by the dashboard) so a failed send is never a dead end. Same
 * centered tile + title + body shape as the student's ChatEndedSection.
 */
function wrappedCopy(
  ended: HostEnded,
  demo: boolean
): { tile: string; title: string; body: string } {
  const { to, state } = ended;

  // The demo never sends anything, whatever a demo teacher typed into the
  // email field. Its card says so plainly and never names an address, so it
  // can't read as a real send.
  if (demo) {
    return {
      tile: "🎬",
      title: "That's a wrap",
      body: "This is the demo, so nothing gets emailed. In a real activity, every chat is sent to your inbox the moment you end it.",
    };
  }

  if (state === "sending") {
    return {
      tile: "",
      title: "Sending your transcripts…",
      body: `We're emailing every chat to ${to}. This only takes a moment.`,
    };
  }

  if (state === "sent") {
    return {
      tile: "📬",
      title: `Sent to ${to}`,
      body: "Every chat from this class is on its way to your inbox. Give it a minute to land.",
    };
  }

  if (state === "failed") {
    return {
      tile: "⚠️",
      title: "We couldn't send the email",
      body: `The message to ${to} didn't go through. Your chats are still below, so copy anything you want to keep before you close this tab.`,
    };
  }

  // "empty": nothing was sent — no address, or no chat had a message.
  return {
    tile: "📭",
    title: "That's a wrap",
    body: to
      ? "These chats had no messages, so there was nothing to email. They're below if you want to look back."
      : "You didn't set an email for this activity, so nothing was sent. Your chats are below if you want to reread them.",
  };
}

export function WrappedUpCard({
  ended,
  demo = false,
}: {
  ended: HostEnded;
  demo?: boolean;
}) {
  const copy = wrappedCopy(ended, demo);
  const sending = ended.state === "sending";

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-brand-grape-soft/60 to-card px-4 py-8 text-center shadow-sm">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-3xl">
          {sending ? (
            <Loader2
              aria-hidden
              className="size-7 animate-spin text-brand-grape motion-reduce:animate-none"
            />
          ) : (
            <span aria-hidden>{copy.tile}</span>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.body}</p>
        </div>

        {!sending && (
          <Button asChild size="lg" className="mt-1">
            <LocaleLink to="/activity/create">Set up a new activity</LocaleLink>
          </Button>
        )}
      </div>
    </div>
  );
}
