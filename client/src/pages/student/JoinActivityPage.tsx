import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { ArrowRight, Handshake, Users, UserX } from "lucide-react";

import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import type { StudentWorldOutletContext } from "@/components/layout/StudentWorldLayout";
import { ChatStage } from "@/components/Student/ChatStage";
import { WaitingLobby } from "@/components/Student/WaitingLobby";
import { Button } from "@/components/ui/button";
import { useLocaleNavigate } from "@/lib/locale";
import { randomFrom } from "@/lib/random";
import { useStudentSession } from "@/lib/studentSession";
import { useLatestRef } from "@/lib/useLatestRef";
import { usePageTitle } from "@/lib/usePageTitle";
import { cn } from "@/lib/utils";
import {
  DEMO_JOIN_CODE,
  DEMO_STUDENT_NAME,
  findActivityByCode,
  type ActivityChatScenarioKey,
} from "@/mockData";

type StudentStage = "code" | "name" | "lobby" | "chatting" | "ended";

/** One mock match the lobby's demo trigger fired the student into. */
interface ActiveMatch {
  /** Bumped per match so ChatStage remounts with a fresh chat every time. */
  seq: number;
  scenarioKey: ActivityChatScenarioKey;
}

const PAGE_TITLES: Record<StudentStage, string> = {
  code: "Join an Activity",
  name: "Join an Activity",
  lobby: "Waiting Lobby",
  chatting: "Chatting",
  ended: "Chat Ended",
};

/**
 * How long the demo lobby waits before the pretend teacher pairs the student
 * anyway, so a visitor who never touches the demo buttons still reaches a
 * chat. ~20s (founder-picked): enough time to take the lobby in first.
 * See DECISIONS.md → "The demo lobby pairs you by itself after 20 seconds".
 */
const DEMO_LOBBY_AUTO_MATCH_MS = 20_000;

/** The floating white card the student world's stages render on. */
const STUDENT_CARD_CLASS =
  "rounded-3xl bg-card shadow-2xl shadow-brand-grape-strong/30";

/**
 * The student flow. Serves both `/activity/join` (code entry) and
 * `/activity/join/:joinCode`, which carries the student through every later
 * stage on one route (enter name → waiting lobby → chatting → chat ended);
 * the UI changes by stage.
 *
 * Stage is derived, not stored: no `:joinCode` param (or an unknown code)
 * means code entry, a known code without a signed-in session means name
 * entry, and a session that matches the code means the lobby — until a mock
 * match starts a chat. The match itself lives only in memory (chat state is
 * mock-only), so a mid-chat refresh lands back in the lobby by design.
 *
 * Demo entries (the homepage's "Try the student side", /demo/student) skip
 * the code screen: they land straight on /activity/join/1234 with the name
 * already filled in, so the lobby is one click away — see DECISIONS.md →
 * "The student demo skips the code screen and joins you as Rachel".
 */
export function JoinActivityPage() {
  const { joinCode: joinCodeParam } = useParams();
  const navigate = useLocaleNavigate();
  const { setChatStudentName } = useOutletContext<StudentWorldOutletContext>();
  const { session, signIn, signOut } = useStudentSession();

  // Set by the lobby's demo match triggers; a real backend pushes this later.
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  // Mirrors the chat engine's ended flag up here so the stage (and with it
  // the page title) can tell chatting from ended.
  const [chatEnded, setChatEnded] = useState(false);

  const activity = joinCodeParam
    ? findActivityByCode(joinCodeParam)
    : undefined;
  const isSignedIn =
    activity !== undefined && session?.joinCode === activity.joinCode;
  const stage: StudentStage = !activity
    ? "code"
    : !isSignedIn
      ? "name"
      : match
        ? chatEnded
          ? "ended"
          : "chatting"
        : "lobby";

  // Reaching the code-entry gate ends any session: browser back from the
  // lobby is how a student redoes a wrong name (see DECISIONS.md). Refreshing
  // the lobby URL never lands here, so refreshes still keep the lobby.
  useEffect(() => {
    if (stage === "code" && session) signOut();
  }, [stage, session, signOut]);

  // While a chat is on screen (live or just ended) the layout swaps its brand
  // pill for the student's name badge — same condition that renders ChatStage
  // below. See DECISIONS.md → "The brand home link disappears mid-chat and
  // while hosting" and "Mid-chat, the student's name is a corner badge".
  const chatStudentName = activity && session && match ? session.name : null;
  useEffect(() => {
    setChatStudentName(chatStudentName);
    return () => setChatStudentName(null);
  }, [chatStudentName, setChatStudentName]);

  usePageTitle(PAGE_TITLES[stage]);

  // Match changes swap the screen on this same route (lobby → chat, rematch,
  // back to lobby) without navigating, so ScrollToTop can't see them — open
  // each one at the top like a fresh page. Layout effect so the jump lands
  // before paint; the ref skips the initial mount, leaving arrival scrolling
  // (including ScrollToTop's back/forward exception) alone. Chatting → ended
  // stays put on purpose: that swap happens in place, mid-read.
  const previousMatchRef = useRef(match);
  useLayoutEffect(() => {
    if (previousMatchRef.current !== match) window.scrollTo(0, 0);
    previousMatchRef.current = match;
  }, [match]);

  const startMatch = (scenarioKey: ActivityChatScenarioKey) => {
    setChatEnded(false);
    setMatch((prev) => ({ seq: (prev?.seq ?? 0) + 1, scenarioKey }));
  };

  // Back to the queue: only ever by the student's own tap (see DECISIONS.md).
  const backToLobby = () => {
    setMatch(null);
    setChatEnded(false);
  };

  // The demo lobby's fallback: after a short wait the pretend teacher pairs
  // the student unprompted (random 1:1 or group). Demo activity only — on a
  // real activity a real teacher does this, via the backend, later.
  const startMatchRef = useLatestRef(startMatch);
  useEffect(() => {
    if (stage !== "lobby" || activity?.joinCode !== DEMO_JOIN_CODE) return;
    const timer = setTimeout(() => {
      startMatchRef.current(randomFrom(["duo", "group"] as const));
    }, DEMO_LOBBY_AUTO_MATCH_MS);
    return () => clearTimeout(timer);
  }, [stage, activity, startMatchRef]);

  // Shared-link arrivals with a bad code land on code entry with the code
  // filled in and the not-found message already showing.
  const [code, setCode] = useState(() => joinCodeParam ?? "");
  const [codeNotFound, setCodeNotFound] = useState(
    () => joinCodeParam !== undefined && activity === undefined
  );
  // The demo arrives with a name ready, so the lobby is one click away; it
  // stays editable, and real codes always start blank.
  const demoPrefillName =
    activity?.joinCode === DEMO_JOIN_CODE ? DEMO_STUDENT_NAME : "";
  const [name, setName] = useState(demoPrefillName);
  const [removedByTeacher, setRemovedByTeacher] = useState(false);

  // Autofocusing an input on a phone pops the keyboard over half the world,
  // so phones only get it when there's typing to do: never on the code input
  // (fresh landing, let the page breathe first) and not on a prefilled demo
  // name. Desktop always autofocuses — no keyboard to pop, and Enter submits
  // the prefilled name straight away.
  const isDesktopViewport = window.matchMedia("(min-width: 640px)").matches;

  const isCodeComplete = /^\d{4}$/.test(code);
  const canJoin = name.trim().length > 0;
  const canSubmit = stage === "name" ? canJoin : isCodeComplete;

  // One form serves both gate stages; only the input and the button label
  // change between them.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (stage === "name") {
      if (!activity) return;
      setRemovedByTeacher(false);
      // A fresh sign-in always starts in the lobby — never in a chat a
      // previous session left behind (e.g. after hopping via the URL bar).
      backToLobby();
      signIn({ name: name.trim(), joinCode: activity.joinCode });
      return;
    }
    if (!findActivityByCode(code)) {
      setCodeNotFound(true);
      return;
    }
    setCodeNotFound(false);
    navigate(`/activity/join/${code}`);
  };

  // Mock event: the teacher kicks the student out of the activity. They're
  // signed out on the spot and land back on the name step (which the demo
  // refills, so rejoining stays one click).
  const teacherRemovesStudent = () => {
    signOut();
    setName(demoPrefillName);
    setRemovedByTeacher(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6">
      {/* From the name stage on, the world is honest about being the demo
          (the code screen resolves no activity, so it can't know yet). */}
      {activity?.joinCode === DEMO_JOIN_CODE && <DemoBanner onWorld />}
      {activity && session && match ? (
        // Chatting + chat ended, on this same route. Keyed per match so a
        // rematch always boots a fresh chat.
        <ChatStage
          key={match.seq}
          studentName={session.name}
          scenarioKey={match.scenarioKey}
          onEndedChange={setChatEnded}
          onBackToLobby={backToLobby}
        />
      ) : stage === "lobby" && activity && session ? (
        <>
          <div className={cn(STUDENT_CARD_CLASS, "w-full p-5 sm:p-6")}>
            <WaitingLobby activity={activity} studentName={session.name} />
          </div>
          <LobbyDemoControls
            onTeacherRemove={teacherRemovesStudent}
            onMatch={startMatch}
          />
        </>
      ) : (
        // Phones anchor the card high so the form is visible without
        // scrolling or hunting; from `sm` up it centers in the viewport.
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
          <div
            className={cn(
              STUDENT_CARD_CLASS,
              "flex w-full animate-in flex-col gap-6 px-6 py-8 text-center duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:px-8"
            )}
          >
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">
                Join an Activity
              </h1>
              {stage === "name" && activity ? (
                <p className="animate-in text-muted-foreground duration-300 fade-in motion-reduce:animate-none">
                  Hosted by{" "}
                  <span className="font-semibold text-foreground">
                    {activity.hostName}
                  </span>{" "}
                  · code {activity.joinCode}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Enter your activity's code.
                </p>
              )}
            </div>

            {removedByTeacher && (
              <div
                role="alert"
                className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                Your teacher removed you from the activity, so you're signed
                out. Enter your name to join again.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-4"
            >
              {stage === "name" ? (
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus={isDesktopViewport || name === ""}
                  maxLength={40}
                  aria-label="Your name"
                  placeholder="Your name"
                  className="w-full animate-in rounded-2xl border-0 bg-brand-grape-soft px-4 py-4 text-center text-xl font-semibold duration-300 outline-none fade-in slide-in-from-bottom-2 focus:ring-2 focus:ring-brand-grape/40 motion-reduce:animate-none"
                />
              ) : (
                <>
                  <input
                    value={code}
                    onChange={(event) => {
                      setCode(
                        event.target.value.replace(/\D/g, "").slice(0, 4)
                      );
                      setCodeNotFound(false);
                    }}
                    inputMode="numeric"
                    autoFocus={isDesktopViewport}
                    aria-label="Join code"
                    placeholder="1234"
                    className="w-full rounded-2xl border-0 bg-brand-grape-soft py-4 text-center text-3xl font-semibold tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-grape/40"
                  />
                  {codeNotFound && (
                    <p
                      role="alert"
                      className="text-sm font-medium text-destructive"
                    >
                      Activity was not found. Recheck the Join Code you entered.
                    </p>
                  )}
                </>
              )}
              {/* Hover stops are hand-tuned darker shades of the
                  `--brand-gradient-*` tokens the base stops come from. */}
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit}
                className="w-full bg-linear-to-r from-brand-gradient-from to-brand-gradient-to hover:from-[#7d5cf5] hover:to-[#5f3fd6]"
              >
                {stage === "name" ? "Join Activity" : "Continue"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The lobby's demo steering: what a real teacher does from the host page —
 * matching this student into a chat (1:1 or a group of 3, so the group drop
 * behavior is demoable too) and removing them from the activity. Permanent
 * demo furniture; on a real activity a backend pushes these instead. If the
 * visitor presses nothing, the auto-match fallback above pairs them anyway.
 */
function LobbyDemoControls({
  onTeacherRemove,
  onMatch,
}: {
  onTeacherRemove: () => void;
  onMatch: (scenarioKey: ActivityChatScenarioKey) => void;
}) {
  return (
    <DemoControlsPanel
      onWorld
      caption="In a real activity, your teacher does this part."
    >
      <div className="grid grid-cols-2 gap-2">
        <EventButton
          onWorld
          onClick={() => onMatch("duo")}
          icon={<Handshake className="size-4" />}
        >
          Pair me 1-on-1
        </EventButton>
        <EventButton
          onWorld
          onClick={() => onMatch("group")}
          icon={<Users className="size-4" />}
        >
          Put me in a group of 3
        </EventButton>
        <div className="col-span-2">
          <EventButton
            onWorld
            onClick={onTeacherRemove}
            icon={<UserX className="size-4" />}
          >
            Teacher removes you
          </EventButton>
        </div>
      </div>
    </DemoControlsPanel>
  );
}
