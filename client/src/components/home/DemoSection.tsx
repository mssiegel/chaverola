import { Gamepad2, Presentation } from "lucide-react";

import {
  HighlightMark,
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import { DEMO_JOIN_CODE } from "@/mockData";

/**
 * "See it in action": the homepage's two demo doorways, straight into the
 * real flows running the demo activity — the teacher's host dashboard
 * mid-round, and the student trip from code entry to a chat. Plain
 * text-and-button blocks, not icon cards, to match the page's hand-made look
 * (see DECISIONS.md → "The hero looks hand-made and never mentions AI").
 * The founder opens the same places in pitches via the speakable redirect
 * URLs /demo/teacher and /demo/student. Secondary buttons on purpose: solid
 * grape stays reserved for the hero's Join CTA, outline for Host.
 */
export function DemoSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16">
      <div className="flex flex-col items-start gap-5 sm:gap-6">
        <SectionEyebrow>See it in action</SectionEyebrow>
        <SectionHeading>
          Poke around a <HighlightMark>live class.</HighlightMark>
        </SectionHeading>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          Both sides of Chaverola, running on pretend students. Click around all
          you like: you don't need to sign up, and you can't break anything.
        </p>
      </div>

      <div className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-2 sm:gap-12">
        <div className="flex flex-col items-start gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            The teacher view
          </h3>
          <p className="text-[15px] text-pretty text-muted-foreground">
            A class in the middle of an activity. Students trickle in and wait
            to be paired, and every chat gets its own live card. You run the
            room.
          </p>
          <Button asChild variant="secondary">
            <LocaleLink to={`/activity/host/${DEMO_JOIN_CODE}`}>
              <Presentation className="size-5 text-brand-grape" />
              Open the teacher demo
            </LocaleLink>
          </Button>
        </div>

        <div className="flex flex-col items-start gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            The student side
          </h3>
          <p className="text-[15px] text-pretty text-muted-foreground">
            Join with the demo code, pick a name, and get matched into a
            character chat. It's the same trip your students will take.
          </p>
          <Button asChild variant="secondary">
            <LocaleLink to="/activity/join">
              <Gamepad2 className="size-5 text-brand-grape" />
              Try the student side
            </LocaleLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
