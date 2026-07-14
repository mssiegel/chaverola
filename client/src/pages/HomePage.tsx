import type { ReactNode } from "react";
import { GraduationCap, MessageCircle } from "lucide-react";

import { FounderNote } from "@/components/home/FounderNote";
import { HeroChatbox } from "@/components/home/HeroChatbox";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import {
  HighlightMark,
  SectionEyebrow,
} from "@/components/home/SectionHeading";
import { TeacherViewSection } from "@/components/home/TeacherViewSection";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import { useChatDemo } from "@/components/chat/useChatDemo";
import { HERO_JOIN_CTA_ID } from "@/lib/useHeroCtaPassed";
import { usePageTitle } from "@/lib/usePageTitle";
import { heroChatScenario } from "@/mockData";

/**
 * The homepage: hero (student-side live chat), the teacher's view of that
 * same chat, how hosting works, and the founder's note. The pitch to a
 * teacher in one glance: a classroom activity where students chat with each
 * other in character (a real classmate behind every character), quick to set
 * up, with the who's-who mystery — and live chatboxes to prove it. Styling
 * stays deliberately plain (highlighter mark, numbered lists), and the copy
 * never mentions AI — see DECISIONS.md → "The hero looks hand-made and never
 * mentions AI".
 *
 * The demo chat is owned here, not by the hero, so the student view (hero)
 * and the teacher preview render one shared conversation — see DECISIONS.md
 * → "The teacher preview mirrors the hero chat live".
 */
export function HomePage() {
  usePageTitle("A Classroom Activity That Students Love");
  const chat = useChatDemo(heroChatScenario);

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-6 pb-6 sm:pt-14 lg:grid-cols-2 lg:gap-14 lg:pt-16 lg:pb-12">
        {/* Pitch */}
        <div className="flex animate-in flex-col items-start gap-5 duration-700 fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:gap-6">
          <SectionEyebrow>A classroom activity for teachers</SectionEyebrow>

          <h1 className="text-4xl leading-[1.12] font-bold tracking-tight text-balance text-foreground sm:text-5xl xl:text-6xl">
            Get your whole class talking.{" "}
            <HighlightMark>In character.</HighlightMark>
          </h1>

          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            You pick the topic and hand out secret characters. Students chat
            with each other about your lesson, and behind every character is a
            real classmate. Nobody knows who's who until you reveal it at the
            end.
          </p>

          <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="shadow-md shadow-brand-grape/25"
            >
              {/* The navbar watches this id to swap modes on mobile. */}
              <LocaleLink id={HERO_JOIN_CTA_ID} to="/activity/join">
                <MessageCircle className="size-5" />
                Join an Activity
              </LocaleLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <LocaleLink to="/activity/create">
                <GraduationCap className="size-5 text-brand-grape" />
                Host an Activity
              </LocaleLink>
            </Button>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-foreground/80">
              Setup takes about a minute:
            </p>
            <ol className="space-y-2 text-[15px] text-foreground/90">
              <HowStep n={1}>
                Create an activity and pick your characters.
              </HowStep>
              <HowStep n={2}>Put the join code on the board.</HowStep>
              <HowStep n={3}>
                Students chat. You watch, then reveal who was who.
              </HowStep>
            </ol>
          </div>
        </div>

        {/* Live sample chat. "the Moon" / "Neil" in this copy must match
            mockData/heroChatDemo.ts — renaming there means updating this
            copy too (with a humanizer pass). */}
        <div className="flex animate-in flex-col gap-3 duration-700 fade-in slide-in-from-bottom-6 motion-reduce:animate-none">
          <p className="text-center text-sm font-semibold text-brand-grape">
            This is the student side, live. Go ahead, type as the Moon.
          </p>
          <HeroChatbox chat={chat} />
          <div className="mx-auto max-w-[92%] -rotate-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-md">
            🤫 In a real round, the Moon and Neil are both your students. Only
            you know who's playing who, until the reveal at the end.
          </div>
        </div>
      </section>

      <TeacherViewSection
        participants={chat.participants}
        messages={chat.messages}
      />

      <HowItWorksSection />

      <FounderNote />

      {/* Temporary demo shortcuts — keep every corner reachable. */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 text-sm text-muted-foreground">
        Poking around? Peek at the{" "}
        <DemoTextLink to="/demo/student-chat">student chatbox</DemoTextLink> or
        the{" "}
        <DemoTextLink to="/demo/teacher-chat">teacher chat cards</DemoTextLink>{" "}
        demo.
      </div>
    </div>
  );
}

function HowStep({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="w-5 shrink-0 font-bold text-brand-grape">{n}.</span>
      <span>{children}</span>
    </li>
  );
}

function DemoTextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <LocaleLink
      to={to}
      className="font-semibold text-brand-grape underline-offset-2 hover:underline"
    >
      {children}
    </LocaleLink>
  );
}
