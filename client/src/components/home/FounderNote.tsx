import { useState } from "react";
import { Mail } from "lucide-react";

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
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <h2 className="text-center text-3xl leading-[1.15] font-bold tracking-tight text-foreground sm:text-4xl">
        A note from the founder
      </h2>

      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card px-5 py-8 shadow-md sm:mt-10 sm:px-10 sm:py-10">
        <div className="flex justify-center">
          <FounderAvatar />
        </div>

        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/90 sm:text-base">
          <p>
            I'm Moshe, and I volunteer in the English department at a high
            school in Beit Shemesh, Israel.
          </p>
          <p>
            I've always loved multiplayer games like Warcraft and Brawl Stars.
            People in them are curious and fully awake in a way you don't often
            see in a classroom, and that kept nagging at me. Could a lesson feel
            that alive?
          </p>
          <p>
            So I built the kind of game I would have loved in high school. Each
            student steps into a character and talks with classmates about
            whatever the class is studying. My hope is that it becomes the
            lesson they retell at dinner.
          </p>
          <p>
            The name comes from two Hebrew words: Chaver, which means friend,
            and Olah, which means rising up. Friends raise each other up.
            That's what I wanted this to be, so I put it right in the name.
          </p>
          <p>
            If you have questions, ideas, or just want to say hi, I'd love to
            hear from you.
          </p>
          <p>
            Sincerely,
            <br />
            <span className="font-semibold text-foreground">Moshe Siegel</span>
          </p>
        </div>

        <div className="mt-7 border-t border-border pt-5 text-center">
          <a
            href="mailto:siegel.moshes@gmail.com"
            className="inline-flex items-center gap-2 font-semibold text-brand-grape underline-offset-2 hover:underline"
          >
            <Mail className="size-4.5" />
            siegel.moshes@gmail.com
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
  const [photo, setPhoto] = useState<"loading" | "ready" | "missing">(
    "loading"
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative size-24 sm:size-28">
        {photo !== "ready" && (
          <div
            role="img"
            aria-label="Placeholder for Moshe Siegel's photo"
            className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-dashed border-brand-grape/45 bg-brand-grape-soft text-2xl font-bold text-brand-grape"
          >
            MS
          </div>
        )}
        {photo !== "missing" && (
          <img
            src={FOUNDER_PHOTO_SRC}
            alt="Moshe Siegel, founder of Chaverola"
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
          photo coming soon
        </span>
      )}
    </div>
  );
}
