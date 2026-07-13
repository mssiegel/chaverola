import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

import {
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import { DEMO_JOIN_CODE } from "@/mockData";

/**
 * "How it works for teachers": four quick steps that stress how little setup
 * hosting takes, ending in the Host CTA. Same deliberately plain styling as
 * the hero's numbered list — no icon cards or template chrome (see
 * DECISIONS.md → "The hero looks hand-made and never mentions AI").
 */
export function HowItWorksSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <div className="flex flex-col items-start gap-5 sm:gap-6">
        <SectionEyebrow>How it works</SectionEyebrow>
        <SectionHeading>
          Live before you've finished taking attendance.
        </SectionHeading>
      </div>

      <ol className="mt-8 grid gap-x-12 gap-y-8 sm:mt-10 sm:grid-cols-2">
        <Step n={1} title="Create the activity">
          Set one up for whatever your class is studying, like a history unit or
          the solar system. It takes about a minute.
        </Step>
        <Step n={2} title="Choose the characters">
          Decide who your students get to be. Characters from the book you're
          reading, or a certain Moon and astronaut.
        </Step>
        <Step n={3} title="Share the 4-digit code">
          Put it on the board. Students tap Join on any device and type it in.
          <span aria-hidden className="mt-3 flex gap-1.5">
            {DEMO_JOIN_CODE.split("").map((digit, index) => (
              <span
                key={index}
                className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-base font-bold text-brand-grape shadow-sm"
              >
                {digit}
              </span>
            ))}
          </span>
        </Step>
        <Step n={4} title="Students join instantly">
          Each student gets a secret character and a classmate to talk to. You
          watch the whole room from your dashboard, then reveal who was who.
        </Step>
      </ol>

      <div className="mt-10 flex flex-col items-center gap-2.5 sm:mt-12">
        {/* Matches the hero's Host button: solid grape stays reserved for
            the student Join CTA. */}
        <Button asChild size="lg" variant="outline">
          <LocaleLink to="/activity/create">
            <GraduationCap className="size-5 text-brand-grape" />
            Host an Activity
          </LocaleLink>
        </Button>
        <p className="text-sm text-muted-foreground">
          There's nothing to print and nothing to install.
        </p>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <span className="w-7 shrink-0 text-2xl leading-7 font-bold text-brand-grape">
        {n}.
      </span>
      <div className="space-y-1">
        <h3 className="text-lg leading-7 font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-[15px] text-pretty text-muted-foreground">
          {children}
        </p>
      </div>
    </li>
  );
}
