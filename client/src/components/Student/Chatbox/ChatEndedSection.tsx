import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowRight, EyeOff, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import type { ChatEndReason, Participant } from "@/types/chat";

interface ChatEndedSectionProps {
  peers: Participant[];
  /** When the teacher's "reveal names" setting is on, show real names. */
  revealNames: boolean;
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
  /** Why the chat ended — every reason gets its own wrap-up copy. */
  endReason?: ChatEndReason | null;
  /** Who ended it, when endReason is "peer" (an id from `peers`). */
  endedByPeerId?: string | null;
  /** Whether the room still had 2+ peers when it ended (scopes the copy). */
  endedInGroup?: boolean;
  /**
   * Replaces the names-stay-secret line shown when revealNames is off.
   * Live rooms pass a neutral one — the reveal doesn't exist yet, so the
   * default line's "your teacher hasn't revealed them" would overpromise.
   */
  secretLine?: string;
  /**
   * The whole activity ended, not just this chat. There's no lobby left to
   * offer, so the CTA drops the rematch line and lands on the activity-over
   * screen instead.
   */
  activityEnded?: boolean;
  onBackToLobby: () => void;
}

/**
 * The dashed box that stands in for the reveal card when there is nothing to
 * reveal — the teacher's setting is off, or this student walked out of a room
 * that is still going and never earned the names.
 */
function SecretBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
      <EyeOff className="size-4" />
      <span>{children}</span>
    </div>
  );
}

/**
 * The tile + title + body for each way a chat can end. A peer who ended it is
 * named by their character, never their real name — the mystery holds until
 * the reveal below. The default case is a safety net for a missing reason.
 *
 * `t` is a parameter and this stays pure, per the extraction rule. The TILES
 * stay in code beside the keys on purpose: they're art, not copy, and the
 * visual language of the eight endings is not a translator's to change.
 */
function endedCopy(
  t: TFunction<"student">,
  endReason: ChatEndReason | null,
  endedByLabel: string | null,
  endedInGroup: boolean
): { tile: string; title: string; body: string } {
  switch (endReason) {
    case "student":
      return {
        tile: "🎬",
        title: t("ended.student.title"),
        body: endedInGroup
          ? t("ended.student.bodyGroup")
          : t("ended.student.body"),
      };
    case "peer":
      return {
        tile: "🎭",
        title: t("ended.peer.title", {
          name: endedByLabel ?? t("ended.partner"),
        }),
        body: t("ended.peer.body"),
      };
    case "teacher":
      return {
        tile: "🎓",
        title: t("ended.teacher.title"),
        body: t("ended.teacher.body"),
      };
    case "peer-timeout":
      return {
        tile: "🔌",
        title: t("ended.peerTimeout.title"),
        body: t("ended.peerTimeout.body"),
      };
    case "self-timeout":
      return {
        tile: "📶",
        title: t("ended.selfTimeout.title"),
        body: t("ended.selfTimeout.body"),
      };
    case "self-left":
      return {
        tile: "👋",
        title: t("ended.selfLeft.title"),
        body: t("ended.selfLeft.body"),
      };
    case "removed":
      // No applause on this one: it's the only ending the student neither
      // chose nor lost to the wifi. Say what happened and where they land.
      return {
        tile: "🚪",
        title: t("ended.removed.title"),
        body: t("ended.removed.body"),
      };
    default:
      return {
        tile: "🎭",
        title: t("ended.fallback.title"),
        body: t("ended.fallback.body"),
      };
  }
}

/**
 * Shown once the chat ends. The header tile explains what happened — who
 * ended it (you, a named character, your teacher) or a lost connection — then
 * optionally reveals who the student was really talking to and invites them
 * back to the lobby for a rematch. The student only leaves when they tap the
 * button.
 */
export function ChatEndedSection({
  peers,
  revealNames,
  characterColors,
  endReason = null,
  endedByPeerId = null,
  endedInGroup = false,
  secretLine,
  activityEnded = false,
  onBackToLobby,
}: ChatEndedSectionProps) {
  const { t } = useTranslation("student");
  const endedBy = endedByPeerId
    ? peers.find((p) => p.id === endedByPeerId)
    : undefined;
  const copy = endedCopy(
    t,
    endReason,
    endedBy?.character.name ?? null,
    endedInGroup
  );

  // A leaver's chat is still going for everyone else, so the mystery must
  // hold — no reveal for them, whatever the teacher's setting says.
  const chatGoesOnWithoutYou = endReason === "self-left";
  // A removal carries no reveal by construction (it never rides a
  // chat:ended), but the screen refuses one outright rather than trusting
  // that: a removed student is out of the activity, not owed its secrets.
  const removed = endReason === "removed";

  return (
    <div className="border-t border-border bg-gradient-to-b from-brand-grape-soft/60 to-card px-4 py-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-3xl">
          {copy.tile}
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">
            {copy.title}
          </h3>
          <p className="text-sm text-muted-foreground">{copy.body}</p>
        </div>

        {/* Removal needs only its explanation and Join again, with no names box. */}
        {removed ? null : chatGoesOnWithoutYou ? (
          <SecretBox>{t("ended.secretLeft")}</SecretBox>
        ) : revealNames ? (
          <div className="w-full rounded-xl border border-border bg-card p-3 text-start shadow-sm">
            <SectionLabel className="mb-2 text-center">
              {t("ended.revealTitle")}
            </SectionLabel>
            <ul className="space-y-1.5">
              {peers.map((peer) => (
                <li
                  key={peer.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  {/* Two teacher/student-authored runs on one row, so each
                      isolates itself — a Hebrew character beside a Latin
                      real name would otherwise swap ends. */}
                  <bdi
                    className="font-semibold"
                    style={{ color: characterColors.get(peer.character.id) }}
                  >
                    {peer.character.name}
                  </bdi>
                  <bdi className="font-medium text-foreground">
                    {peer.realName}
                  </bdi>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <SecretBox>{secretLine ?? t("ended.secretDefault")}</SecretBox>
        )}

        <div className="w-full space-y-2 pt-1">
          {removed ? (
            // The seat went with the removal, so there is no lobby and no
            // rematch to offer. The tap runs the sign-out this screen
            // deferred and lands them on the name step.
            // flip-rtl on both arrows: "onwards" follows the reading
            // direction.
            <Button size="lg" className="w-full" onClick={onBackToLobby}>
              {t("ended.joinAgain")}
              <ArrowRight className="flip-rtl size-4" />
            </Button>
          ) : activityEnded ? (
            // No rematch to promise and no lobby to return to — the tap just
            // closes the wrap-up out onto the activity-over screen.
            <Button size="lg" className="w-full" onClick={onBackToLobby}>
              {t("ended.done")}
              <ArrowRight className="flip-rtl size-4" />
            </Button>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                {t("ended.again")}
              </p>
              <Button size="lg" className="w-full" onClick={onBackToLobby}>
                {/* No flip-rtl: a cycle glyph turns the same way everywhere. */}
                <RotateCcw className="size-4" />
                {t("ended.backToLobby")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
