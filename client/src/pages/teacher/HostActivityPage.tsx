import { useParams } from "react-router-dom";

import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { Button } from "@/components/ui/button";

/** `/activity/host/:joinCode` — teacher's live activity page. Built out later. */
export function HostActivityPage() {
  const { joinCode } = useParams();

  return (
    <PlaceholderPage
      eyebrow={`Hosting ${joinCode}`}
      title="Live activity"
      description="Watch every pair chat in real time, expand a conversation, reveal names, and end the round. The teacher chatbox isn't ready just yet."
    >
      <Button asChild size="lg">
        <LocaleLink to="/activity/create">Set up another activity</LocaleLink>
      </Button>
      <LocaleLink
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back home
      </LocaleLink>
    </PlaceholderPage>
  );
}
