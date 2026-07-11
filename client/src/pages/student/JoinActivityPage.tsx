import { useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";

import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { Button } from "@/components/ui/button";

/**
 * `/activity/join/:joinCode` — this single route carries the student through
 * every stage (enter name → waiting lobby → chatting → chat ended); the UI
 * changes by stage. Built out in later prompts; for now it points at the
 * working chatbox demo.
 */
export function JoinActivityPage() {
  const { joinCode } = useParams();

  return (
    <PlaceholderPage
      eyebrow={`Activity ${joinCode}`}
      title="You're in!"
      description="Enter your name, wait in the lobby, then chat in character. We're still building this part."
    >
      <Button asChild size="lg">
        <LocaleLink to="/demo/student-chat">
          <MessageSquare className="size-4" />
          Open the chatbox demo
        </LocaleLink>
      </Button>
      <LocaleLink
        to="/activity/join"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Use a different code
      </LocaleLink>
    </PlaceholderPage>
  );
}
