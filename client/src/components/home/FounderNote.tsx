import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";

import { CONTACT_EMAIL, mailtoHref } from "@/components/home/PlansSection";
import { cn } from "@/lib/utils";

/** The founder's headshot, served from client/public. */
const FOUNDER_PHOTO_SRC = "/founder-moshe.jpg";

/**
 * The founder's letter at the bottom of the homepage. The text is the
 * founder's story, reworked through the humanizer pass with his sign-off —
 * any future edits should stay in his plain, warm voice. Contact email sits
 * right under the sign-off.
 */
export function FounderNote() {
  const { t } = useTranslation("home");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-6 pb-14 sm:pt-8 sm:pb-20">
      <h2 className="text-center text-3xl leading-[1.15] font-normal tracking-tight text-foreground sm:text-4xl rtl:tracking-normal">
        {t("founder.heading")}
      </h2>

      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card px-5 py-8 shadow-md sm:mt-10 sm:px-10 sm:py-10">
        <div className="flex justify-center">
          <FounderAvatar />
        </div>

        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/90 sm:text-base">
          <p>{t("founder.p1")}</p>
          <p>{t("founder.p2")}</p>
          <p>{t("founder.p3")}</p>
          <p>{t("founder.p4")}</p>
          <p>{t("founder.p5")}</p>
          <p>
            {t("founder.signoff")}
            <br />
            <span className="font-semibold text-foreground">
              {t("founder.name")}
            </span>
          </p>
        </div>

        <div className="mt-7 border-t border-border pt-5 text-center">
          <a
            href={mailtoHref(
              t("founder.mailto.subject"),
              t("founder.mailto.body")
            )}
            className="inline-flex items-center gap-2 font-semibold text-brand-grape underline-offset-2 hover:underline"
          >
            {/* An envelope: not directional. */}
            <Mail className="size-4.5" />
            {/* Latin address in Hebrew prose — <bdi> keeps the dot and the @
                from jumping ends. */}
            <bdi>{CONTACT_EMAIL}</bdi>
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * The photo lives at `client/public/founder-moshe.jpg`. The initials circle
 * is the default and the photo only swaps in on a successful load, so if the
 * file ever goes missing or gets renamed, the section shows the clearly
 * marked placeholder instead of a broken-image box.
 */
function FounderAvatar() {
  const { t } = useTranslation("home");
  const [photo, setPhoto] = useState<"loading" | "ready" | "missing">(
    "loading"
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative size-24 sm:size-28">
        {photo !== "ready" && (
          <div
            role="img"
            aria-label={t("founder.photoPlaceholder")}
            className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-dashed border-brand-grape/45 bg-brand-grape-soft text-2xl font-bold text-brand-grape"
          >
            {t("founder.initials")}
          </div>
        )}
        {photo !== "missing" && (
          <img
            src={FOUNDER_PHOTO_SRC}
            alt={t("founder.photoAlt")}
            onLoad={() => setPhoto("ready")}
            onError={() => setPhoto("missing")}
            className={cn(
              "size-full rounded-full border border-border object-cover object-top shadow-md",
              photo !== "ready" && "invisible"
            )}
          />
        )}
      </div>
      {photo === "missing" && (
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("founder.photoSoon")}
        </span>
      )}
    </div>
  );
}
