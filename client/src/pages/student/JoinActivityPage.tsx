import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, UserX } from "lucide-react";

import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import { WaitingLobby } from "@/components/Student/WaitingLobby";
import { Button } from "@/components/ui/button";
import { useLocalePath } from "@/lib/locale";
import { useStudentSession } from "@/lib/studentSession";
import { usePageTitle } from "@/lib/usePageTitle";
import { cn } from "@/lib/utils";
import { DEMO_JOIN_CODE, findActivityByCode } from "@/mockData";

type StudentStage = "code" | "name" | "lobby";

/** The floating white card the student world's stages render on. */
const STUDENT_CARD_CLASS =
  "rounded-3xl bg-card shadow-2xl shadow-brand-grape-strong/30";

/**
 * The student flow. Serves both `/activity/join` (code entry) and
 * `/activity/join/:joinCode`, which carries the student through every later
 * stage on one route (enter name → waiting lobby → chatting → chat ended);
 * the UI changes by stage. Chatting/ended are wired in a later prompt.
 *
 * Stage is derived, not stored: no `:joinCode` param (or an unknown code)
 * means code entry, a known code without a signed-in session means name
 * entry, and a session that matches the code means the lobby.
 */
export function JoinActivityPage() {
  const { joinCode: joinCodeParam } = useParams();
  const navigate = useNavigate();
  const localePath = useLocalePath();
  const { session, signIn, signOut } = useStudentSession();

  const activity = joinCodeParam
    ? findActivityByCode(joinCodeParam)
    : undefined;
  const isSignedIn =
    activity !== undefined && session?.joinCode === activity.joinCode;
  const stage: StudentStage = !activity
    ? "code"
    : isSignedIn
      ? "lobby"
      : "name";

  // Reaching the code-entry gate ends any session: browser back from the
  // lobby is how a student redoes a wrong name (see DECISIONS.md). Refreshing
  // the lobby URL never lands here, so refreshes still keep the lobby.
  useEffect(() => {
    if (stage === "code" && session) signOut();
  }, [stage, session, signOut]);

  usePageTitle(
    stage === "lobby"
      ? "Chaverola | Waiting Lobby"
      : "Chaverola | Join an Activity"
  );

  // Shared-link arrivals with a bad code land on code entry with the code
  // filled in and the not-found message already showing.
  const [code, setCode] = useState(() => joinCodeParam ?? "");
  const [codeNotFound, setCodeNotFound] = useState(
    () => joinCodeParam !== undefined && activity === undefined
  );
  const [name, setName] = useState("");
  const [removedByTeacher, setRemovedByTeacher] = useState(false);

  // Autofocusing the code input on a phone pops the keyboard over half the
  // world before the student has even seen the page — desktop only. The name
  // input autofocuses everywhere: by then they're committed to joining.
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
      signIn({ name: name.trim(), joinCode: activity.joinCode });
      return;
    }
    if (!findActivityByCode(code)) {
      setCodeNotFound(true);
      return;
    }
    setCodeNotFound(false);
    navigate(localePath(`/activity/join/${code}`));
  };

  // Mock event: the teacher kicks the student out of the activity. They're
  // signed out on the spot and must enter their name again to rejoin.
  const teacherRemovesStudent = () => {
    signOut();
    setName("");
    setRemovedByTeacher(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6">
      {stage === "lobby" && activity && session ? (
        <>
          <div className={cn(STUDENT_CARD_CLASS, "w-full p-5 sm:p-6")}>
            <WaitingLobby activity={activity} studentName={session.name} />
          </div>
          <LobbyDemoControls onTeacherRemove={teacherRemovesStudent} />
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
                  autoFocus
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

          {stage === "code" && (
            <p className="rounded-full bg-white/15 px-4 py-2 text-sm text-white/85 backdrop-blur-sm">
              Demo code{" "}
              <button
                type="button"
                onClick={() => {
                  setCode(DEMO_JOIN_CODE);
                  setCodeNotFound(false);
                }}
                className="font-semibold text-white underline-offset-2 hover:underline"
              >
                {DEMO_JOIN_CODE}
              </button>{" "}
              always works.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Dev-only trigger for the "teacher removed you" mock event. Goes away once a
 * real backend drives removal.
 */
function LobbyDemoControls({
  onTeacherRemove,
}: {
  onTeacherRemove: () => void;
}) {
  return (
    <DemoControlsPanel onWorld>
      <EventButton
        onWorld
        onClick={onTeacherRemove}
        icon={<UserX className="size-4" />}
      >
        Teacher removes you
      </EventButton>
    </DemoControlsPanel>
  );
}
