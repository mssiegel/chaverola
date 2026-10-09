import { useTranslation } from "react-i18next";
import { GraduationCap, MessageCircle } from "lucide-react";

// Side-effect import: registers the `home` namespace for both locales into
// this page's chunk. Every module that reads home:* strings must be reachable
// from here.
import "@/i18n/ns/home";
// …and `chat`, because the hero renders the real chatbox: header, feed,
// composer, emoji picker. Those pieces read chat:* wherever they are mounted.
import "@/i18n/ns/chat";

import { DemoSection } from "@/components/home/DemoSection";
import { FounderNote } from "@/components/home/FounderNote";
import { HeroChatbox } from "@/components/home/HeroChatbox";
import { PlansSection } from "@/components/home/PlansSection";
import { TeacherViewSection } from "@/components/home/TeacherViewSection";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import { useChatDemo } from "@/components/chat/useChatDemo";
import { useDemoContent } from "@/lib/demoContent";
import { HERO_JOIN_CTA_ID } from "@/lib/useHeroCtaPassed";
import { usePageMeta } from "@/lib/usePageMeta";

/**
 * The homepage: hero (student-side live chat), the teacher's view of that
 * same chat, the demo doorways, the two plans, and the
 * founder's note. The pitch to a
 * teacher in one glance: a classroom activity where students chat with each
 * other in character (a real classmate behind every character), quick to set
 * up, with the who's-who mystery — and live chatboxes to prove it. Styling
 * stays deliberately plain (solid headlines, numbered lists), and the copy
 * never mentions AI — see DECISIONS.md → "The hero looks hand-made and never
 * mentions AI".
 *
 * The demo chat is owned here, not by the hero, so the student view (hero)
 * and the teacher preview render one shared conversation — see DECISIONS.md
 * → "The teacher preview mirrors the hero chat live".
 */
export function HomePage() {
  // "home" first, so unprefixed keys resolve there; "common" for the shared
  // navbar-grade strings this page reuses (the Join CTA).
  const { t } = useTranslation(["home", "common"]);
  usePageMeta(t("meta.title"), t("meta.description"));
  const { heroScenario } = useDemoContent();
  const chat = useChatDemo(heroScenario);

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-6 pb-6 sm:pt-14 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-6 lg:pt-16 lg:pb-12">
        {/* Pitch */}
        <div className="flex animate-in flex-col items-start gap-5 duration-700 fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:gap-6">
          <h1 className="text-4xl leading-[1.12] font-normal tracking-tight text-balance text-foreground sm:text-5xl xl:text-6xl rtl:tracking-normal">
            {t("hero.title")}
          </h1>

          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            {t("hero.intro")}
          </p>

          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            {t("hero.pitch")}
          </p>

          <div className="flex w-full flex-col gap-3 pt-1 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="shadow-md shadow-brand-grape/25"
            >
              {/* The navbar watches this id to swap modes on mobile. */}
              <LocaleLink id={HERO_JOIN_CTA_ID} to="/activity/join">
                {/* A speech bubble and a mortarboard: not directional. */}
                <MessageCircle className="size-5" />
                {t("common:nav.joinLong")}
              </LocaleLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <LocaleLink to="/activity/create">
                <GraduationCap className="size-5 text-brand-grape" />
                {t("cta.host")}
              </LocaleLink>
            </Button>
          </div>
        </div>

        {/* The real student chatbox, driven by the locale's demo scenario. */}
        <div className="flex animate-in flex-col gap-3 duration-700 fade-in slide-in-from-bottom-6 motion-reduce:animate-none">
          <p className="text-center text-sm font-semibold text-brand-grape">
            {t("hero.chatCaption")}
          </p>
          <HeroChatbox chat={chat} />
        </div>
      </section>

      <TeacherViewSection
        participants={chat.participants}
        messages={chat.messages}
      />

      <DemoSection />

      <PlansSection />

      <FounderNote />
    </div>
  );
}
