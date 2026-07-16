import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { DemoBanner } from "@/components/demo/DemoBanner";
import { HostActivityDashboard } from "@/components/Teacher/HostActivity";
import { Badge } from "@/components/ui/badge";
import { readHostedActivity, saveHostedActivity } from "@/lib/activitySetup";
import { useLocalePath } from "@/lib/locale";
import { usePageTitle } from "@/lib/usePageTitle";
import { DEMO_JOIN_CODE, demoHostedActivity } from "@/mockData";
import type { HostedActivity } from "@/types/activity";

/**
 * `/activity/host/:joinCode` — the teacher's live activity page.
 *
 * Which activity renders: the one the teacher just hosted (stashed by the
 * setup form under `chaverola.hostedActivity`, so a refresh keeps it), or
 * the Rome demo for direct visits to `/activity/host/1234` — the same
 * activity the student side mocks, so the pin on screen really works on
 * `/activity/join` in another tab. Any other unknown code redirects to the
 * demo pin so the URL, the pin, and the student link always agree. See
 * DECISIONS.md → "Teacher live activity page".
 */
export function HostActivityPage() {
  const { joinCode } = useParams();
  const localePath = useLocalePath();
  usePageTitle("Your Live Activity");

  const resolved = useMemo(() => {
    if (!joinCode) return null;
    if (joinCode === DEMO_JOIN_CODE) {
      return { activity: demoHostedActivity(), fromStash: false };
    }
    const stashed = readHostedActivity(joinCode);
    return stashed ? { activity: stashed, fromStash: true } : null;
  }, [joinCode]);

  if (!resolved) {
    return (
      <Navigate to={localePath(`/activity/host/${DEMO_JOIN_CODE}`)} replace />
    );
  }

  return (
    <HostedActivityView
      key={resolved.activity.joinCode}
      initialActivity={resolved.activity}
      persistEdits={resolved.fromStash}
    />
  );
}

function HostedActivityView({
  initialActivity,
  persistEdits,
}: {
  initialActivity: HostedActivity;
  /**
   * True when the activity came from the sessionStorage stash: live edits
   * write back so a refresh keeps them. The Rome demo stays memory-only —
   * writing it to the stash could clobber a real hosted activity.
   */
  persistEdits: boolean;
}) {
  const [activity, setActivity] = useState(initialActivity);

  const handleActivityChange = (next: HostedActivity) => {
    setActivity(next);
    if (persistEdits) saveHostedActivity(next);
  };

  return (
    <div className="relative isolate">
      {/* The demo's pretend-students banner pins below the navbar for the
          whole scroll; HostHeader's condensed waiting bar stands down on the
          demo so the two never fight over that band. */}
      {activity.joinCode === DEMO_JOIN_CODE && <DemoBanner />}

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
        <HostActivityDashboard
          activity={activity}
          onActivityChange={handleActivityChange}
        />
      </div>
    </div>
  );
}
