import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { GraduationCap, Mail } from "lucide-react";

import { SectionEyebrow } from "@/components/home/SectionHeading";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Same address as the founder's note; the subject and greeting come from the
 *  catalog, so a Hebrew visitor's draft opens in Hebrew. */
export const CONTACT_EMAIL = "siegel.moshes@gmail.com";

export function mailtoHref(subject: string, body: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * The two plans, right above the founder's note. The free plan is the whole
 * current product and must never read as limited; Complete Implementation has
 * no listed price — its CTA opens a write-to-Moshe dialog. See DECISIONS.md →
 * "The homepage has a two-plan section, and the free plan stays the whole
 * product".
 */
export function PlansSection() {
  const { t } = useTranslation("home");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <SectionEyebrow>{t("plans.eyebrow")}</SectionEyebrow>

      <div className="mx-auto mt-8 grid w-full max-w-md gap-6 sm:mt-10 lg:max-w-4xl lg:grid-cols-2 lg:gap-8">
        <PlanCard
          name={t("plans.free.name")}
          tagline={t("plans.free.tagline")}
          bullets={[
            t("plans.free.bullet1"),
            t("plans.free.bullet2"),
            t("plans.free.bullet3"),
            t("plans.free.bullet4"),
            t("plans.free.bullet5"),
          ]}
          footer={
            /* Matches the other Host buttons: solid grape stays reserved
               for the student Join CTA. */
            <Button asChild size="lg" variant="outline">
              <LocaleLink to="/activity/create">
                <GraduationCap className="size-5 text-brand-grape" />
                {t("cta.host")}
              </LocaleLink>
            </Button>
          }
        />

        <PlanCard
          highlighted
          name={t("plans.complete.name")}
          tagline={t("plans.complete.tagline")}
          bullets={[
            t("plans.complete.bullet1"),
            // <Trans> because the logo and the product name have to stay
            // glued together mid-sentence, and where in the sentence they
            // land is a word-order decision.
            <Trans
              key="classroom"
              t={t}
              i18nKey="plans.complete.bullet2"
              components={{
                1: (
                  <span className="whitespace-nowrap">
                    <GoogleClassroomLogo />
                    &nbsp;
                  </span>
                ),
              }}
            />,
            t("plans.complete.bullet3"),
            t("plans.complete.bullet4"),
          ]}
          footer={<CompleteContactDialog />}
        />
      </div>
    </section>
  );
}

function PlanCard({
  name,
  tagline,
  bullets,
  footer,
  highlighted = false,
}: {
  name: string;
  tagline: string;
  bullets: ReactNode[];
  footer: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:p-8",
        highlighted
          ? "border-brand-grape/40 shadow-lg shadow-brand-grape/10"
          : "border-border shadow-md"
      )}
    >
      <div className="space-y-1.5">
        <h3 className="text-2xl font-normal text-foreground">{name}</h3>
        <p className="text-[15px] text-pretty text-muted-foreground">
          {tagline}
        </p>
      </div>
      <ul className="space-y-2 text-[15px] text-foreground/90">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex gap-2.5">
            <span aria-hidden className="shrink-0 font-bold text-brand-grape">
              ·
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col items-center gap-2.5 pt-2 text-center">
        {footer}
      </div>
    </div>
  );
}

/**
 * The Google Classroom logo (gold frame, green board, three figures, eraser),
 * redrawn as a tiny inline SVG so nothing loads from Google's servers. Sits
 * inline with the integrations bullet; decorative, the text names the product.
 */
function GoogleClassroomLogo() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="inline-block size-4 -translate-y-px align-text-bottom"
    >
      <rect x="0.5" y="2.5" width="23" height="19" rx="2" fill="#ffc112" />
      <rect x="2.5" y="4.5" width="19" height="15" fill="#21a464" />
      <circle cx="7.4" cy="10.9" r="1.5" fill="#57bb8a" />
      <path d="M4.4 15.6c0-1.2 1.4-2.2 3-2.2s3 1 3 2.2v.7h-6z" fill="#57bb8a" />
      <circle cx="16.6" cy="10.9" r="1.5" fill="#57bb8a" />
      <path
        d="M13.6 15.6c0-1.2 1.4-2.2 3-2.2s3 1 3 2.2v.7h-6z"
        fill="#57bb8a"
      />
      <circle cx="12" cy="9.6" r="2.1" fill="#fff" />
      <path
        d="M7.9 16.3c0-1.8 1.8-3.1 4.1-3.1s4.1 1.3 4.1 3.1h-8.2z"
        fill="#fff"
      />
      <rect x="14.5" y="20.2" width="5" height="1.6" fill="#f1f1f1" />
    </svg>
  );
}

/**
 * There's no set price, so instead of a checkout the CTA opens a short note
 * with a prefilled email to Moshe. The raw address is shown too (select-all)
 * for anyone without a mail app wired up.
 */
function CompleteContactDialog() {
  const { t } = useTranslation("home");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="secondary">
          <Mail className="size-5 text-brand-grape" />
          {t("plans.complete.cta")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pe-6 leading-snug">
            {t("plans.dialog.title")}
          </DialogTitle>
          <DialogDescription>{t("plans.dialog.body")}</DialogDescription>
        </DialogHeader>
        <Button asChild variant="secondary">
          <a
            href={mailtoHref(t("plans.mailto.subject"), t("plans.mailto.body"))}
          >
            <Mail className="size-5 text-brand-grape" />
            {t("plans.dialog.emailCta")}
          </a>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("plans.dialog.copyLabel")}{" "}
          {/* A Latin address inside Hebrew prose: <bdi> keeps the dot and the
              @ from jumping to the wrong end of the run. */}
          <bdi className="font-semibold text-brand-grape select-all">
            {CONTACT_EMAIL}
          </bdi>
        </p>
      </DialogContent>
    </Dialog>
  );
}
