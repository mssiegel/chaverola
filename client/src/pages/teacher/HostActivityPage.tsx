import { useState, type ReactNode } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { useParams } from "react-router-dom";

import { DemoBanner } from "@/components/demo/DemoBanner";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { HostActivityDashboard } from "@/components/Teacher/HostActivity";
import { useHostActivityDemo } from "@/components/Teacher/HostActivity/useHostActivityDemo";
import { useHostActivityLive } from "@/components/Teacher/HostActivity/useHostActivityLive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/usePageTitle";
import { useHostedActivityLookup } from "@/lib/useHostedActivityLookup";
import { DEMO_JOIN_CODE, demoHostedActivity } from "@/mockData";
import type { HostedActivity } from "@/types/activity";

/**
 * The copy for a host-page load that has blown past the slow-hint mark —
 * the free-tier server takes ~30s to wake. Mirrors the join page's line.
 */
const SLOW_HOST_LOOKUP_COPY =
  "Chaverola is just waking up. The first load of the day takes about " +
  "half a minute.";

/**
 * `/activity/host/:hostKey` — the teacher's live activity page. The URL is
 * the capability: the create form lands here with the freshly minted key,
 * and the same link keeps working from any device (shareable with an
 * assistant teacher; see DECISIONS.md → "Host access is a URL capability").
 *
 * Which activity renders: `1234` hosts the Rome demo, fully client-simulated
 * — the same activity the student side mocks, so the pin on screen really
 * works on `/activity/join` in another tab. Every other param resolves over
 * `GET /activities/host/:hostKey` and then holds a live teacher socket for
 * the real queue; a link that doesn't resolve (expired activity, stale
 * 4-digit link, typo) gets a friendly not-found — the old
 * always-redirect-to-the-demo is gone now that real links exist.
 */
export function HostActivityPage() {
  const { hostKey } = useParams();
  usePageTitle("Your Live Activity");

  // The demo never consults this: the hook settles `1234` (or any other
  // non-key-shaped param) as not-found without a network trip.
  const { lookup, slow, retry } = useHostedActivityLookup(hostKey);

  if (hostKey === DEMO_JOIN_CODE) {
    return (
      <DemoHostActivityView
        key={DEMO_JOIN_CODE}
        initialActivity={demoHostedActivity()}
      />
    );
  }

  if (lookup.state === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <Loader2
          aria-hidden
          className="size-8 animate-spin text-brand-grape motion-reduce:animate-none"
        />
        <p className="text-lg font-semibold text-foreground">
          Finding your activity…
        </p>
        {slow && (
          <p className="text-sm text-muted-foreground">
            {SLOW_HOST_LOOKUP_COPY}
          </p>
        )}
      </div>
    );
  }

  if (lookup.state === "unreachable") {
    return (
      <PlaceholderPage
        eyebrow="For teachers"
        title="We can't reach Chaverola"
        description="Your activity may well still be running. Check your internet, then try again."
      >
        <Button size="lg" onClick={retry}>
          <RotateCw aria-hidden className="size-4" />
          Try again
        </Button>
      </PlaceholderPage>
    );
  }

  if (lookup.state === "not-found") {
    return <HostActivityNotFound />;
  }

  // The lookup only settles "found" for a pattern-valid key, so hostKey is
  // a real string on this branch.
  return (
    <LiveHostActivityView
      key={hostKey}
      initialActivity={lookup.activity}
      hostKey={hostKey!}
    />
  );
}

/**
 * The friendly dead-link screen — reached from a lookup that 404ed, and
 * from a live class whose activity vanished under it (a server wipe or
 * restart mid-lesson ends every class; the socket surfaces it).
 */
function HostActivityNotFound() {
  return (
    <PlaceholderPage
      eyebrow="For teachers"
      title="That activity isn't running"
      description="Activities only stay up while class is happening, and this link doesn't match any that are live right now. If you typed or pasted it, double-check it. Setting up a new activity takes about a minute."
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <LocaleLink to="/activity/create">Set up a new activity</LocaleLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <LocaleLink to="/">Back home</LocaleLink>
        </Button>
      </div>
    </PlaceholderPage>
  );
}

/**
 * The shared page shell: brand glow, badge, and (on the demo) the sticky
 * pretend-students banner.
 */
function HostActivityChrome({
  demo = false,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate">
      {/* The demo's pretend-students banner pins below the navbar for the
          whole scroll; HostHeader's condensed waiting bar stands down on the
          demo so the two never fight over that band. */}
      {demo && <DemoBanner />}

      {/* The setup page's sibling: same soft brand glow, clipped so it can
          never cause sideways scroll on phones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-24 -left-20 size-72 rounded-full bg-brand-grape/10 blur-3xl" />
        <div className="absolute -top-16 -right-16 size-64 rounded-full bg-brand-coral/10 blur-3xl" />
        <div className="absolute top-72 right-1/4 size-56 rounded-full bg-brand-sun/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:pt-10">
        <div className="mb-5">
          <Badge>For teachers</Badge>
        </div>
        {children}
      </div>
    </div>
  );
}

/*
  The demo/live split is a component split, never a conditional hook (the
  react-hooks lint forbids it and the React Compiler needs it clean): each
  branch is its own thin wrapper calling its own engine hook, and the
  dashboard just takes the resulting HostEngine.

  Edits (the live-settings panel, the rail's auto-match switch) apply to the
  local `activity` state only. On the demo that IS the real thing — the
  whole class is client-side. On a real activity there's no edit endpoint
  yet, so changes don't reach students and a refresh refetches the server's
  copy (founder-accepted; see DECISIONS.md → "The live-settings panel stays
  on real activities, editing the teacher's local view").
*/

function DemoHostActivityView({
  initialActivity,
}: {
  initialActivity: HostedActivity;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const engine = useHostActivityDemo(activity);

  return (
    <HostActivityChrome demo>
      <HostActivityDashboard
        activity={activity}
        onActivityChange={setActivity}
        engine={engine}
        demoTriggers={engine}
      />
    </HostActivityChrome>
  );
}

function LiveHostActivityView({
  initialActivity,
  hostKey,
}: {
  initialActivity: HostedActivity;
  hostKey: string;
}) {
  // The activity died under the class (server wipe/restart). Rendering the
  // not-found here unmounts the connected view — and with it the socket —
  // instead of leaving a dead connection behind the screen.
  const [gone, setGone] = useState(false);

  if (gone) return <HostActivityNotFound />;
  return (
    <ConnectedHostActivityView
      initialActivity={initialActivity}
      hostKey={hostKey}
      onActivityGone={() => setGone(true)}
    />
  );
}

function ConnectedHostActivityView({
  initialActivity,
  hostKey,
  onActivityGone,
}: {
  initialActivity: HostedActivity;
  hostKey: string;
  onActivityGone: () => void;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const engine = useHostActivityLive({ hostKey, onActivityGone });

  return (
    <HostActivityChrome>
      <HostActivityDashboard
        activity={activity}
        onActivityChange={setActivity}
        engine={engine}
      />
    </HostActivityChrome>
  );
}
