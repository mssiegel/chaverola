import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { Button } from "@/components/ui/button";

/** Friendly catch-all. */
export function NotFoundPage() {
  return (
    <PlaceholderPage
      eyebrow="404"
      title="Nothing here 🫥"
      description="That page wandered off. Let's get you back."
    >
      <Button asChild size="lg">
        <LocaleLink to="/">Back home</LocaleLink>
      </Button>
    </PlaceholderPage>
  );
}
