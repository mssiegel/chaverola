import {
  HighlightMark,
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { ChatCard } from "@/components/Teacher/ChatCard";
import type { ChatMessage, Participant } from "@/types/chat";

interface TeacherViewSectionProps {
  /** Participants of the hero's live demo chat, straight from `useChatDemo`. */
  participants: Participant[];
  /** The hero chat's live message list — the card mirrors it in real time. */
  messages: ChatMessage[];
}

/**
 * "What it looks like for teachers": the real teacher monitoring card
 * (`ChatCard`) fed the same live chat as the hero chatbox above it. Real
 * names show next to characters here and nowhere else on the page — that
 * contrast is the whole pitch. Anything the visitor types up top lands in
 * this card too. The Moon's student is "Dana K", never "You": the teacher
 * assigns chats and is not a player (see DECISIONS.md → "Demo students have
 * short names, and the teacher is never one of them"). No `onEndChat` is
 * passed, so the card hides its End chat button — a landing page shouldn't
 * offer a destructive-looking control.
 */
export function TeacherViewSection({
  participants,
  messages,
}: TeacherViewSectionProps) {
  return (
    <section className="border-y border-border/70 bg-brand-grape-soft/30">
      {/* grid-cols-1 (not the implicit auto track) so the chat card clamps
          to the viewport on narrow phones instead of forcing min-content. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14">
        {/* Pitch */}
        <div className="flex flex-col items-start gap-5">
          <SectionEyebrow>The teacher's view</SectionEyebrow>

          <SectionHeading>
            Students see characters. You see{" "}
            <HighlightMark>who's who.</HighlightMark>
          </SectionHeading>

          {/* No "this card" here: on phones the card renders well below this
              text, so spatial pointing breaks. The caption right above the
              card does the pointing instead — see DECISIONS.md.
              "the Moon" / "Neil Armstrong" / "Dana K" below must match
              mockData/heroChatDemo.ts — renaming there means updating this
              copy too (with a humanizer pass). */}
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            At the top of this page, someone plays the Moon and someone plays
            Neil Armstrong. As the teacher, you see that same chat with each
            student's real name next to their character.
          </p>

          <ul className="max-w-lg list-disc space-y-2.5 pl-5 text-[15px] text-foreground/90 marker:text-brand-grape">
            <li>
              Only you see the names. Students talk to each other in character
              until you reveal who was who.
            </li>
            <li>
              Every chat in your activity gets its own live card, so you can
              watch the whole room at once.
            </li>
            <li>
              When the activity wraps up, Chaverola can email you the full
              transcript of every chat.
            </li>
          </ul>
        </div>

        {/* The real monitoring card, live */}
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-brand-grape">
            This is the teacher side, live. Same chat, now with names.
          </p>
          <div className="mx-auto w-full max-w-md">
            <ChatCard
              participants={participants}
              messages={messages}
              isEnded={false}
            />
          </div>
          <div className="mx-auto max-w-[92%] rotate-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-md">
            🕵️ Try it: say something as the Moon up top, then check back here.
            In this demo you're borrowing Dana K's seat, so the message shows up
            with her name on it.
          </div>
        </div>
      </div>
    </section>
  );
}
