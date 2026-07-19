import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  ArrowRight,
  Handshake,
  Loader2,
  Pause,
  Play,
  Users,
  UserX,
} from "lucide-react";

import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import type { StudentWorldOutletContext } from "@/components/layout/StudentWorldLayout";
import { ChatStage } from "@/components/Student/ChatStage";
import { WaitingLobby } from "@/components/Student/WaitingLobby";
import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/api";
import { scaledMs } from "@/lib/demoTime";
import { useLocaleNavigate } from "@/lib/locale";
import { randomFrom } from "@/lib/random";
import { useStudentSession } from "@/lib/studentSession";
import {
  primeActivityLookup,
  SLOW_LOOKUP_HINT_MS,
  useActivityLookup,
} from "@/lib/useActivityLookup";
import { useLatestRef } from "@/lib/useLatestRef";
import { usePageTitle } from "@/lib/usePageTitle";
import { useWarmUpServer } from "@/lib/useWarmUpServer";
import { cn } from "@/lib/utils";
import {
  DEMO_JOIN_CODE,
  DEMO_STUDENT_NAME,
  type ActivityChatScenarioKey,
} from "@/mockData";

type StudentStage =
  "code" | "loading" | "name" | "lobby" | "chatting" | "ended";

/** What went wrong with the last code the student tried. */
type CodeProblem = "not-found" | "unreachable";

/** One mock match the lobby's demo trigger fired the student into. */
interface ActiveMatch {
  /** Bumped per match so ChatStage remounts with a fresh chat every time. */
  seq: number;
  scenarioKey: ActivityChatScenarioKey;
}

const PAGE_TITLES: Record<StudentStage, string> = {
  code: "Join an Activity",
  loading: "Join an Activity",
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

/**
 * The copy for a lookup that has blown past the slow-hint mark
 * (SLOW_LOOKUP_HINT_MS). Shared by the code-entry button's pending state
 * and the loading stage.
 */
const SLOW_LOOKUP_COPY =
  "Chaverola is just waking up. The first join of the day takes about half a minute.";

/** The copy for a server we couldn't reach at all — distinct from not-found. */
const UNREACHABLE_COPY =
  "We can't reach Chaverola right now. Check your internet, then try again.";

/** The floating white card the student world's stages render on. */
const STUDENT_CARD_CLASS =
  "rounded-3xl bg-card shadow-2xl shadow-brand-grape-strong/30";

/**
 * The student flow. Serves both `/activity/join` (code entry) and
 * `/activity/join/:joinCode`, which carries the student through every later
 * stage on one route (enter name → waiting lobby → chatting → chat ended);
 * the UI changes by stage.
 *
 * Stage is derived, not stored: no `:joinCode` param means code entry, a
 * code still being looked up means loading, a code that resolved to nothing
 * falls back to code entry, a found activity without a signed-in session
 * means name entry, and a session that matches the code means the lobby —
 * until a mock match starts a chat. The demo activity (`1234`) resolves
 * synchronously with zero network; real codes go through the API
 * (`useActivityLookup`). The match itself lives only in memory (chat state
 * is mock-only), so a mid-chat refresh lands back in the lobby by design.
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

  // Wake the free-tier server the moment a student arrives, so the code
  // they're about to type resolves against a warm instance.
  useWarmUpServer();

  const {
    lookup,
    slow: slowLookup,
    deliver: deliverLookup,
  } = useActivityLookup(joinCodeParam);
  const activity = lookup.state === "found" ? lookup.activity : undefined;

  // Set by the lobby's demo match triggers; a real backend pushes this later.
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  // Mirrors the chat engine's ended flag up here so the stage (and with it
  // the page title) can tell chatting from ended.
  const [chatEnded, setChatEnded] = useState(false);
  // The teacher's activity-wide pause, mocked at page level so it survives
  // lobby ⇄ chat ⇄ ended. A real backend pushes this later.
  const [classPaused, setClassPaused] = useState(false);

  const isSignedIn =
    activity !== undefined && session?.joinCode === activity.joinCode;
  const stage: StudentStage = !joinCodeParam
    ? "code"
    : lookup.state === "loading"
      ? "loading"
      : !activity
        ? "code"
        : !isSignedIn
          ? "name"
          : match
            ? chatEnded
              ? "ended"
              : "chatting"
            : "lobby";

  // Only a *resolved* landing at the code-entry gate ends a session: bare
  // /activity/join (browser back from the lobby is how a student redoes a
  // wrong name — see DECISIONS.md) or a code the server said doesn't exist.
  // The in-flight lookup and an unreachable server never sign anyone out —
  // with an async lookup, a lobby refresh passes through a "no activity
  // yet" moment, and signing out on it would destroy the session on every
  // refresh. Unreachable keeps the session so the lobby comes right back
  // once the server answers again.
  useEffect(() => {
    const resolvedToCodeEntry =
      joinCodeParam === undefined || lookup.state === "not-found";
    if (resolvedToCodeEntry && session) signOut();
  }, [joinCodeParam, lookup.state, session, signOut]);

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
  // real activity a real teacher does this, via the backend, later. A paused
  // class pairs nobody; the timer restarts fresh on resume (fine for a demo).
  const startMatchRef = useLatestRef(startMatch);
  useEffect(() => {
    if (stage !== "lobby" || classPaused) return;
    if (activity?.joinCode !== DEMO_JOIN_CODE) return;
    const timer = setTimeout(() => {
      startMatchRef.current(randomFrom(["duo", "group"] as const));
    }, scaledMs(DEMO_LOBBY_AUTO_MATCH_MS));
    return () => clearTimeout(timer);
  }, [stage, classPaused, activity, startMatchRef]);

  const [code, setCode] = useState(() => joinCodeParam ?? "");
  // The message under the code input has two sources: a submit that came
  // back empty-handed (state), and a shared-link arrival whose URL code
  // resolved to nothing (derived straight from the lookup, so it's already
  // showing when the code gate appears). Typing dismisses both.
  const [submitProblem, setSubmitProblem] = useState<CodeProblem | null>(null);
  const [lookupProblemDismissed, setLookupProblemDismissed] = useState(false);
  const lookupProblem: CodeProblem | null =
    joinCodeParam !== undefined &&
    (lookup.state === "not-found" || lookup.state === "unreachable")
      ? lookup.state
      : null;
  const codeProblem =
    submitProblem ?? (lookupProblemDismissed ? null : lookupProblem);
  // True while the code-entry submit's own lookup is in flight.
  const [lookingUpCode, setLookingUpCode] = useState(false);
  // True once that submit lookup has blown past the slow-hint mark; the
  // timer is scheduled by the submit handler itself.
  const [submitSlow, setSubmitSlow] = useState(false);
  const submitSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const canSubmit =
    stage === "name" ? canJoin : isCodeComplete && !lookingUpCode;

  const showSubmitPatience = lookingUpCode && submitSlow;
  const showLoadingPatience = stage === "loading" && slowLookup;

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
    // The demo code resolves with zero network — the demo works offline.
    if (code === DEMO_JOIN_CODE) {
      setSubmitProblem(null);
      navigate(`/activity/join/${code}`);
      return;
    }
    setLookingUpCode(true);
    setSubmitSlow(false);
    submitSlowTimerRef.current = setTimeout(
      () => setSubmitSlow(true),
      SLOW_LOOKUP_HINT_MS
    );
    void getActivity(code).then((result) => {
      if (submitSlowTimerRef.current !== null) {
        clearTimeout(submitSlowTimerRef.current);
        submitSlowTimerRef.current = null;
      }
      setLookingUpCode(false);
      if (!result.ok) {
        setSubmitProblem(
          result.kind === "not_found" ? "not-found" : "unreachable"
        );
        return;
      }
      setSubmitProblem(null);
      if (code === joinCodeParam) {
        // Already on this URL (a lobby refresh that found the server down,
        // then a resubmit): navigating is a no-op, so hand the activity to
        // the lookup directly.
        deliverLookup(result.data.activity);
      } else {
        // Hand the fetched activity to the target route's fresh lookup so
        // the code input swaps in-place for the name input (see
        // DECISIONS.md) instead of flashing a loading screen over a
        // refetch.
        primeActivityLookup(result.data.activity);
        navigate(`/activity/join/${code}`);
      }
    });
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
          classPaused={classPaused}
          onClassPausedChange={setClassPaused}
        />
      ) : stage === "lobby" && activity && session ? (
        <>
          <div className={cn(STUDENT_CARD_CLASS, "w-full p-5 sm:p-6")}>
            <WaitingLobby
              activity={activity}
              studentName={session.name}
              isPaused={classPaused}
            />
          </div>
          {/* Demo steering is demo furniture: a real activity's lobby waits
              for a real teacher, so it renders none of this. */}
          {activity.joinCode === DEMO_JOIN_CODE && (
            <LobbyDemoControls
              onTeacherRemove={teacherRemovesStudent}
              onMatch={startMatch}
              classPaused={classPaused}
              onClassPausedChange={setClassPaused}
            />
          )}
        </>
      ) : stage === "loading" ? (
        // The URL names a code whose lookup is still in flight (a lobby
        // refresh, a shared link). Its own stage on purpose: rendering the
        // code gate here would fire the sign-out effect mid-lookup.
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
          <div
            role="status"
            className={cn(
              STUDENT_CARD_CLASS,
              "flex w-full animate-in flex-col items-center gap-4 px-6 py-10 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8"
            )}
          >
            <Loader2
              aria-hidden
              className="size-8 animate-spin text-brand-grape motion-reduce:animate-none"
            />
            <p className="text-lg font-semibold text-foreground">
              Finding your activity…
            </p>
            {showLoadingPatience && (
              <p className="text-sm text-muted-foreground">
                {SLOW_LOOKUP_COPY}
              </p>
            )}
          </div>
        </div>
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
                      setSubmitProblem(null);
                      setLookupProblemDismissed(true);
                    }}
                    // Read-only (not disabled) mid-lookup: edits mid-flight
                    // would make the answer about a different code, but a
                    // disabled input would drop focus and the phone keyboard.
                    readOnly={lookingUpCode}
                    inputMode="numeric"
                    autoFocus={isDesktopViewport}
                    aria-label="Join code"
                    placeholder="1234"
                    className="w-full rounded-2xl border-0 bg-brand-grape-soft py-4 text-center text-3xl font-semibold tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-grape/40"
                  />
                  {codeProblem && (
                    <p
                      role="alert"
                      className="text-sm font-medium text-destructive"
                    >
                      {codeProblem === "not-found"
                        ? "Activity was not found. Recheck the Join Code you entered."
                        : UNREACHABLE_COPY}
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
                {stage === "name" ? (
                  <>
                    Join Activity
                    <ArrowRight className="size-4" />
                  </>
                ) : lookingUpCode ? (
                  <>
                    Finding your activity…
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              {showSubmitPatience && (
                <p role="status" className="text-sm text-muted-foreground">
                  {SLOW_LOOKUP_COPY}
                </p>
              )}
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
  classPaused,
  onClassPausedChange,
}: {
  onTeacherRemove: () => void;
  onMatch: (scenarioKey: ActivityChatScenarioKey) => void;
  classPaused: boolean;
  onClassPausedChange: (paused: boolean) => void;
}) {
  return (
    <DemoControlsPanel
      onWorld
      caption="In a real activity, your teacher does this part."
    >
      <div className="grid grid-cols-2 gap-2">
        {/* Pairing stays enabled while paused on purpose: a teacher can
            still hand-pick matches mid-announcement, and the chat that
            opens is born frozen. */}
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
        <EventButton
          onWorld
          onClick={() => onClassPausedChange(true)}
          disabled={classPaused}
          icon={<Pause className="size-4" />}
        >
          Teacher pauses the class
        </EventButton>
        <EventButton
          onWorld
          onClick={() => onClassPausedChange(false)}
          disabled={!classPaused}
          icon={<Play className="size-4" />}
        >
          Teacher resumes the class
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
