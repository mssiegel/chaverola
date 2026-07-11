import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { Button } from "@/components/ui/button";
import { DEMO_JOIN_CODE } from "@/mockData";

/** `/activity/create` — teacher sets up an activity. Built out later. */
export function CreateActivityPage() {
  return (
    <PlaceholderPage
      eyebrow="Teacher"
      title="Create an activity"
      description="Pick characters, set the rules, and get a join code to share with your class. Setup is coming soon."
    >
      <Button asChild size="lg">
        <LocaleLink to={`/activity/host/${DEMO_JOIN_CODE}`}>
          Go to the host view
        </LocaleLink>
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
