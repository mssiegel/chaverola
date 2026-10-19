import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";

import type { LobbyConnectionState } from "@chaverola/shared";

// Side-effect imports: register the `student` and `chat` namespaces into
// this page chunk, which is the only chunk that renders their strings.
import "@/i18n/ns/student";
import "@/i18n/ns/chat";

import { DemoBanner } from "@/components/demo/DemoBanner";
import type { StudentWorldOutletContext } from "@/components/layout/StudentWorldLayout";
import { ChatStage } from "@/components/Student/ChatStage";
import { LiveChatStage } from "@/components/Student/LiveChatStage";
import { WaitingLobby } from "@/components/Student/WaitingLobby";
import { useDemoContent } from "@/lib/demoContent";
import {
  isLocale,
  switchLocalePath,
  useLocale,
  useLocaleNavigate,
} from "@/lib/locale";
import { clearLocalePin, writeLocalePin } from "@/lib/activityLocalePin";
import { localeIsExplicit } from "@/lib/localePreference";
import { useStudentSession } from "@/lib/studentSession";
import { useActivityLookup } from "@/lib/useActivityLookup";
import { usePageMeta } from "@/lib/usePageMeta";
import { cn } from "@/lib/utils";
import { DEMO_JOIN_CODE } from "@/mockData";
import type { Activity } from "@/types/activity";

import { ActivityFullCard } from "./join/ActivityFullCard";
import { ActivityGoneCard } from "./join/ActivityGoneCard";
import { JoinGateCard } from "./join/JoinGateCard";
import { LoadingCard } from "./join/LoadingCard";
import { LobbyDemoControls } from "./join/LobbyDemoControls";
import { ReconnectingCard } from "./join/ReconnectingCard";
import {
  STAGE_TITLE_KEYS,
  STUDENT_CARD_CLASS,
  type StudentStage,
} from "./join/stageTypes";
import { useActiveMatch } from "./join/useActiveMatch";
import { useDemoLobby } from "./join/useDemoLobby";

/**
 * The student flow. Serves both `/activity/join` (code entry) and
 * `/activity/join/:joinCode`, which carries the student through every later
 * stage on one route (enter name → waiting lobby → chatting → chat ended);
 * the UI changes by stage.
 *
 * Stage is derived, not stored: no `:joinCode` param means code entry, a
 * code still being looked up means loading, a code whose lookup can't reach
 * the server holds a signed-in student on the reconnecting card while the
 * lookup retries itself, a code that resolved to nothing
 * falls back to code entry, a found activity without a signed-in session
 * means name entry, and a session that matches the code means the lobby —
 * until a match starts a chat: the demo's mock triggers on `1234`, the
 * server's `chat:started` on real activities. The demo activity resolves
 * synchronously with zero network; real codes go through the API
 * (`useActivityLookup`). A demo match lives only in memory, so a mid-chat
 * refresh lands back in the lobby; a live match resumes across refresh —
 * the server re-emits `chat:started` to a matched seat on every welcome.
 *
 * Demo entries (the homepage's "Try the student side", /demo/student) skip
 * the code screen: they land straight on /activity/join/1234 with the name
 * already filled in, so the lobby is one click away — see DECISIONS.md →
 * "The student demo skips the code screen and joins you as Rachel".
 *
 * This shell is a composition root: the live/demo match state lives in
 * `useActiveMatch`, the demo lobby furniture in `useDemoLobby`, the code +
 * name form in `JoinGateCard`, and the pure socket reducers in
 * `join/liveMatchState.ts`. What stays here is the stage machine, the
 * session and its latches, and the render dispatch.
 */
export function JoinActivityPage() {
  const { t } = useTranslation("student");
  const { joinCode: joinCodeParam } = useParams();
  const navigate = useLocaleNavigate();
  const { setChatStudentName, setLocaleLocked } =
    useOutletContext<StudentWorldOutletContext>();
  const { session, signIn, signOut, updateSession } = useStudentSession();

  const {
    lookup,
    deliver: deliverLookup,
    retryNow: retryLookup,
  } = useActivityLookup(joinCodeParam);
  const activity = lookup.state === "found" ? lookup.activity : undefined;

  // A student who still holds a session for the code in the URL, on a lookup
  // that couldn't reach the server. Their seat is real and the server is
  // holding it through its grace window, so they get a holding screen — never
  // the code gate, which would read as "you're out" over a seat that's fine.
  const heldSeatUnreachable =
    lookup.state === "unreachable" &&
    joinCodeParam !== undefined &&
    session?.joinCode === joinCodeParam;

  const isSignedIn =
    activity !== undefined && session?.joinCode === activity.joinCode;

  const isRealActivity =
    activity !== undefined && activity.joinCode !== DEMO_JOIN_CODE;

  // The activity's own language, applied the instant its code resolves and
  // never again: a student who typed the plain join link lands in the language
  // the teacher set the class up in, so the whole room matches the projector.
  //
  // Only while no seat exists. `/` and `/he` are separate <Route> mounts, so
  // this redirect gives the page a different identity — React unmounts and
  // remounts it, wiping state and dropping any socket. Harmless here and only
  // here: with nothing in sessionStorage the student isn't seated, so
  // useActiveMatch (declared below, and gated on `seated`) has opened no
  // socket to drop. Keep this effect above it.
  //
  // An explicit choice still outranks the activity — a `/he` the visitor
  // arrived with, or a switcher pick. A bare path is no preference at all,
  // even once applyBootLocale has rewritten it from navigator.language, and
  // that is exactly the rung this implements (DECISIONS.md → "Locale is
  // detected once at boot and remembered").
  //
  // UNLESS the teacher locked the activity, which is the one thing that beats
  // an explicit choice: the class reads one language, and a student can't
  // pick their way out of an English lesson. See DECISIONS.md → "A teacher
  // can lock an activity to its language".
  const locale = useLocale();
  const { pathname, search, hash } = useLocation();
  const navigateAcrossLocales = useNavigate();
  // The demo is exempt from both: nobody set `1234` up, so it has no authored
  // language — it's whatever you're reading it in.
  const inheritedLocale = isRealActivity ? activity.locale : undefined;
  // `=== true`, never truthy: an older server answers without the field for
  // the length of a deploy, and absence has to read as unlocked.
  const localeLocked = isRealActivity && activity.lockLocale === true;
  useEffect(() => {
    // NOT relaxed by the lock, ever. `/` and `/he` are separate <Route>
    // mounts, so this navigate remounts the tree — and useLobbyPresence's
    // cleanup emits `lobby:leave`, which mid-lobby drops the seat and
    // mid-chat IS the leave-the-chat path, ending the partner's chat. A
    // language is not worth that. The seated case is covered instead by the
    // pin below, which decides before React mounts.
    if (session !== null) return;
    if (!localeLocked && localeIsExplicit()) return;
    // Guarded, not trusted: an older server during a deploy answers without
    // the field, and `/undefined/activity/join/1234` is a worse bug than not
    // inheriting at all.
    if (!isLocale(inheritedLocale) || inheritedLocale === locale) return;
    navigateAcrossLocales(
      `${switchLocalePath(pathname, inheritedLocale)}${search}${hash}`,
      { replace: true }
    );
  }, [
    session,
    localeLocked,
    inheritedLocale,
    locale,
    pathname,
    search,
    hash,
    navigateAcrossLocales,
  ]);

  // Written while the student is still unseated, so a later reload can be
  // answered before React exists rather than by the blocked effect above.
  // Unconditional on a locked activity, redirect or not: the pin has to exist
  // even when the locale already matched, or the first reload from a phone
  // set to another language walks straight out of the lock.
  useEffect(() => {
    if (!localeLocked || !isLocale(inheritedLocale)) return;
    if (joinCodeParam === undefined) return;
    writeLocalePin({ joinCode: joinCodeParam, locale: inheritedLocale });
  }, [localeLocked, inheritedLocale, joinCodeParam]);

  // Which real join code the socket said died under us. Latched into state
  // by the presence hook's onEnded callback (the presence value itself
  // resets when its socket tears down) and matched against the current code
  // AND session, so it can't bleed onto another activity; the ended
  // screen's CTA and a fresh sign-in clear it explicitly.
  const [goneCode, setGoneCode] = useState<string | null>(null);
  const activityGoneFromSocket =
    goneCode !== null &&
    goneCode === joinCodeParam &&
    session?.joinCode === goneCode;

  // The REST path of the same truth: a resolved not-found while the session
  // holds a seat token for that exact code. The token is proof the code WAS
  // real, so this is "the class ended", never "recheck your code" — this is
  // the wake-after-deploy path (dark phone → reload → 404).
  const activityGoneFromLookup =
    joinCodeParam !== undefined &&
    lookup.state === "not-found" &&
    session?.joinCode === joinCodeParam &&
    session.token !== undefined;

  const activityGone = activityGoneFromSocket || activityGoneFromLookup;

  // Both roads to the latch: the socket's activity:ended and the demo's
  // "teacher ends the activity" beat.
  const latchActivityGone = () => {
    if (activity) setGoneCode(activity.joinCode);
  };

  // The demo arrives with a name ready, so the lobby is one click away; it
  // stays editable, and real codes always start blank.
  const demoStudentName = useDemoContent().studentName;
  const demoPrefillName =
    activity?.joinCode === DEMO_JOIN_CODE ? demoStudentName : "";
  const [name, setName] = useState(demoPrefillName);
  // Why the gate is showing a removal notice, and how much of it to say:
  // "lobby" is a removal with nothing to wrap up, so the notice explains
  // itself; "chat" means the wrap-up screen already did the explaining and
  // the notice is just the instruction. Null is the ordinary gate.
  const [removedNotice, setRemovedNotice] = useState<"lobby" | "chat" | null>(
    null
  );
  // Code-entry state lives here, not in JoinGateCard: the page persists
  // across the /activity/join ↔ /activity/join/:code SPA navigation, so a
  // page-level seed keeps the last-typed code through a browser-back from the
  // lobby (the "redo a wrong name" flow) — a card-local seed would reset it,
  // since the card unmounts once the stage leaves the gate.
  const [code, setCode] = useState(() => joinCodeParam ?? "");

  // The seated stages — lobby, chatting, ended — are exactly "signed into a
  // found activity"; which of the three is a `match`/`chatEnded` detail, so
  // this gate can be read before useActiveMatch owns that state. (The same
  // set as `baseStage` being one of those three, minus the match dependency.)
  const seated =
    joinCodeParam !== undefined &&
    lookup.state !== "loading" &&
    activity !== undefined &&
    isSignedIn;

  // The removal landing, wherever it is reached from: signed out, blank name
  // field, and the notice that says why. The field stays blank on real
  // activities by founder call — most removals target a fake name, so don't
  // hand it back for one-tap re-entry; a mistyped real name is quick to
  // retype.
  const landOnNameStep = (from: "lobby" | "chat") => {
    signOut();
    setName("");
    setRemovedNotice(from);
  };

  const {
    match,
    chatEnded,
    setChatEnded,
    liveEndReason,
    liveEndedBy,
    revealed,
    removedMidChat,
    startMatch,
    backToLobby,
    presence,
    paused: livePaused,
    teacherPresent,
    retrying,
    retry,
    returnToLobby,
    leaveChat,
    sendChatMessage,
    retryLiveMessage,
    sendHoldUntil,
    sendTyping,
  } = useActiveMatch({
    activity,
    session,
    updateSession,
    seated,
    isRealActivity,
    activityGoneFromSocket,
    // Reached only for a removal with no chat on screen — the hook turns a
    // mid-chat one into an ending and defers this to that screen's CTA.
    onRemoved: () => landOnNameStep("lobby"),
    // Latch the dead activity's code, which flips the stage to activity-gone
    // — except over an ended chat, which holds the screen until its CTA.
    onEnded: () => latchActivityGone(),
    // The teacher edited the lobby's details mid-activity (feature 17, the
    // roster added by 18): rebuild the activity field-by-field and settle it
    // into the lookup — settled state outranks the hand-off map and any
    // refetch, so every render site (lobby chips, join gate) follows without
    // new state. A silent swap by design, like activity:paused. null
    // instructions OMIT the key, the server's own shape, so the lobby's
    // block disappears rather than rendering empty.
    //
    // This is the LOBBY roster and nothing else. A student mid-chat gets
    // this event too, and their chat does not move: in-chat labels resolve
    // against the frozen `cast` chat:started carried, never this lookup
    // (feature 18 prompt 1). `?? activity.characters` covers the deploy
    // window where the server hasn't started sending the roster yet.
    onActivityDetails: (payload) => {
      if (!activity) return;
      const next: Activity = {
        joinCode: activity.joinCode,
        hostName: payload.hostName,
        characters: payload.characters ?? activity.characters,
        // Carried, not re-read: both are frozen at create, and the details
        // channel deliberately doesn't carry them. Dropping `lockLocale` here
        // would quietly unlock the activity for every seated student the
        // moment the teacher renamed a character.
        locale: activity.locale,
        lockLocale: activity.lockLocale,
      };
      if (payload.studentInstructions !== null) {
        next.studentInstructions = payload.studentInstructions;
      }
      deliverLookup(next);
    },
  });

  // The classic stage machine. The activity-gone override is layered on
  // AFTER the presence hook has had its say; the base value keys off the
  // demo/live match state that useActiveMatch owns.
  const baseStage: StudentStage = !joinCodeParam
    ? "code"
    : lookup.state === "loading"
      ? "loading"
      : heldSeatUnreachable
        ? "reconnecting"
        : !activity
          ? "code"
          : !isSignedIn
            ? "name"
            : match
              ? chatEnded
                ? "ended"
                : "chatting"
              : "lobby";
  // The gone latch outranks every stage but one: a student reading their
  // ended chat keeps it. End activity settles every chat before it tears the
  // activity down, so the wrap-up — reveal included — is already on screen
  // when activity:ended lands, and it renders from `chatEnded` state that
  // needs no socket. The gone card takes over on the student's own tap, when
  // backToLobby drops baseStage out of "ended". A student still in the lobby
  // has nothing to keep and goes straight to the card, as before.
  const stage: StudentStage =
    activityGone && baseStage !== "ended" ? "activity-gone" : baseStage;

  const { classPaused, setClassPaused, demoWifiBlip, triggerWifiBlip } =
    useDemoLobby({ stage, activity, startMatch });

  // Only a *resolved* landing at the code-entry gate ends a session: bare
  // /activity/join (browser back from the lobby is how a student redoes a
  // wrong name — see DECISIONS.md) or a code the server said doesn't exist.
  // The in-flight lookup and an unreachable server never sign anyone out —
  // with an async lookup, a lobby refresh passes through a "no activity
  // yet" moment, and signing out on it would destroy the session on every
  // refresh. Unreachable keeps the session so the lobby comes right back
  // once the server answers again. The activity-gone screen also holds the
  // session (it renders FROM it) — its CTA lands here signed-in on purpose,
  // and that's when the sign-out finally runs.
  const resolvedToCodeEntry =
    joinCodeParam === undefined || lookup.state === "not-found";
  // The removal notice clears on the same landing, and not only on a rejoin:
  // it sits above the form on every gate stage, so a removed student who backs
  // out to code entry would otherwise read it stacked on top of a "recheck
  // your Join Code" error. Landing at code entry is the same moment the
  // session ends, so the notice about losing a seat has nothing left to
  // explain.
  // Reset DURING RENDER, not in the effect below, which is React's own answer
  // for state that a change in props/URL invalidates
  // (https://react.dev/learn/you-might-not-need-an-effect). It converges on the
  // spot — the guard makes the second pass a no-op — so the gate never paints
  // one frame carrying a notice it is about to drop. Not derived away instead
  // (rendering the notice only off the stage): the state has to actually clear,
  // or retyping a code would bring the notice back on the name step it already
  // left behind.
  if (resolvedToCodeEntry && removedNotice !== null) {
    setRemovedNotice(null);
  }
  // The sign-out stays an effect — it reaches outside React, and it is the one
  // thing here that must not run twice.
  useEffect(() => {
    if (!resolvedToCodeEntry) return;
    // The pin goes with the seat: back at the bare gate this tab belongs to
    // no activity, so it shouldn't still be answering to one lesson's rule.
    clearLocalePin();
    if (session && !activityGoneFromLookup) signOut();
  }, [resolvedToCodeEntry, session, signOut, activityGoneFromLookup]);

  // While a chat is on screen (live or just ended) the layout swaps its brand
  // pill for the student's name badge — same condition that renders ChatStage
  // below. See DECISIONS.md → "The brand home link disappears mid-chat and
  // while hosting" and "Mid-chat, the student's name is a corner badge".
  const chatStudentName = activity && session && match ? session.name : null;
  useLayoutEffect(() => {
    setChatStudentName(chatStudentName);
    return () => setChatStudentName(null);
  }, [chatStudentName, setChatStudentName]);

  // And a locked activity takes the language pill away for the rest of the
  // flow — offering a switch that the rung above would immediately undo is
  // worse than offering none. It stays up until the code resolves: the gate
  // has to be readable to whoever is typing a code, and before a lookup
  // answers we genuinely don't know whose class this is.
  useEffect(() => {
    setLocaleLocked(localeLocked);
    return () => setLocaleLocked(false);
  }, [localeLocked, setLocaleLocked]);

  // Which meta this screen carries. Two stages sit behind a URL someone can
  // open cold: bare /activity/join, where a student holding a code arrives,
  // and the demo's /activity/join/1234, which is what /demo/student resolves
  // to and what a pitch link opens. Those two get copy written for a search
  // result and a link preview; every later stage keeps its per-stage tab
  // label, because nobody links a waiting lobby.
  //
  // Not STAGE_TITLE_KEYS.code: `title.join` is also the gate's own h1
  // (JoinGateCard), so rewriting it for search would rewrite the heading on
  // screen. Keyed off the URL param rather than the resolved activity, since
  // the meta is a fact about the URL and this way it's right on first render.
  const demoEntry =
    joinCodeParam === DEMO_JOIN_CODE &&
    (stage === "loading" || stage === "name");
  const metaTitleKey = demoEntry
    ? "join.demo.meta.title"
    : stage === "code"
      ? "join.meta.title"
      : STAGE_TITLE_KEYS[stage];
  usePageMeta(
    t(metaTitleKey),
    t(demoEntry ? "join.demo.meta.description" : "join.meta.description")
  );

  // Match changes swap the screen on this same route (lobby → chat, rematch,
  // back to lobby) without navigating, so ScrollToTop can't see them — open
  // each one at the top like a fresh page. Keyed on the match's IDENTITY,
  // not the object: a live chat:update replaces the object mid-chat and
  // must not yank the reader to the top. Layout effect so the jump lands
  // before paint; the ref skips the initial mount, leaving arrival scrolling
  // (including ScrollToTop's back/forward exception) alone. Chatting → ended
  // stays put on purpose: that swap happens in place, mid-read.
  const matchKey =
    match === null
      ? null
      : match.kind === "demo"
        ? `demo-${match.seq}`
        : match.chatId;
  const previousMatchKeyRef = useRef(matchKey);
  useLayoutEffect(() => {
    if (previousMatchKeyRef.current !== matchKey) window.scrollTo(0, 0);
    previousMatchKeyRef.current = matchKey;
  }, [matchKey]);

  const lobbyConnection: LobbyConnectionState =
    activity?.joinCode === DEMO_JOIN_CODE
      ? demoWifiBlip
        ? "reconnecting"
        : "connected"
      : presence === "reconnecting"
        ? "reconnecting"
        : "connected";

  // The lobby's leave door. Same road browser-back takes: land on code entry,
  // where the resolved-code-entry effect above signs the student out, and the
  // presence hook's teardown emits the flush-protected `lobby:leave` on its
  // way down. Never a second hand-rolled emit — the LEAVE_FLUSH_MS gap in
  // useLobbyPresence is a prod lesson, and this path already carries it.
  const leaveActivity = () => navigate("/activity/join");

  // Mock event: the teacher kicks the student out of the activity. They're
  // signed out on the spot and land back on the name step (which the demo
  // refills, so rejoining stays one click).
  const teacherRemovesStudent = () => {
    signOut();
    setName(demoPrefillName);
    setRemovedNotice("lobby");
  };

  // The name-stage submit's page effects: a fresh sign-in must not inherit a
  // dead activity's latch (the same 4-digit code can be minted again), and
  // it always starts in the lobby — never in a chat a previous session left
  // behind (e.g. after hopping via the URL bar).
  const handleJoinActivity = () => {
    if (!activity) return;
    setRemovedNotice(null);
    setGoneCode(null);
    backToLobby();
    signIn({ name: name.trim(), joinCode: activity.joinCode });
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center gap-6">
      {/* From the name stage on, the world is honest about being the demo
          (the code screen resolves no activity, so it can't know yet). */}
      {activity?.joinCode === DEMO_JOIN_CODE && <DemoBanner onWorld />}
      {stage === "activity-gone" ? (
        // The class died under a seated student (deploy/restart wipe, TTL).
        // First in the chain on purpose: it renders from the session alone,
        // before any activity-dependent branch can fall through, and its
        // CTA is what finally signs the student out (see the effect above).
        <ActivityGoneCard
          onEnterNewCode={() => {
            setGoneCode(null);
            navigate("/activity/join");
          }}
        />
      ) : activity && session && match ? (
        // Chatting + chat ended, on this same route. Keyed per match so a
        // rematch always boots a fresh chat.
        match.kind === "demo" ? (
          <ChatStage
            key={match.seq}
            studentName={session.name}
            scenarioKey={match.scenarioKey}
            onEndedChange={setChatEnded}
            onBackToLobby={backToLobby}
            classPaused={classPaused}
            onClassPausedChange={setClassPaused}
            activityEnded={activityGone}
            onActivityEnds={latchActivityGone}
          />
        ) : (
          <LiveChatStage
            key={match.chatId}
            self={match.self}
            peers={match.peers}
            everPeers={match.everPeers}
            messages={match.messages}
            typingPeerId={match.typingPeerId}
            offlinePeers={match.offlinePeers}
            returnedFlashId={match.returnedFlashId}
            isEnded={chatEnded}
            endReason={liveEndReason}
            endedByPeerId={liveEndedBy}
            revealNames={revealed}
            isPaused={livePaused}
            // The lobby's pill and the chat's banner read one value: your
            // own drop is the same event on either screen.
            connection={lobbyConnection}
            activityEnded={activityGone}
            onSend={sendChatMessage}
            onRetryMessage={retryLiveMessage}
            sendHoldUntil={sendHoldUntil}
            onTyping={sendTyping}
            // The exit keeps the seat: chat:leave ends the chat (or steps
            // out of a group), the server answers with chat:ended, and the
            // student reads their wrap-up screen right here. Leaving the
            // activity is a lobby act now, not a chat one.
            onEndChat={leaveChat}
            // The ended screen's Back tap: the server returns the
            // wrapping-up seat to the queue with a fresh clock, and the
            // local match state clears. With the activity gone the emit is
            // already a no-op (the presence hook dropped its socket when the
            // latch flipped), and clearing the match is what hands the screen
            // to the activity-over card.
            onBackToLobby={() => {
              // A removal took the seat with the chat, so there's no queue
              // to be returned to — the tap runs the sign-out the ending
              // screen deferred and lands on the name step instead.
              if (removedMidChat) {
                backToLobby();
                landOnNameStep("chat");
                return;
              }
              returnToLobby();
              backToLobby();
            }}
          />
        )
      ) : stage === "lobby" && activity && session ? (
        presence === "full" ? (
          // The seat cap said no — the lobby gate's own copy, with a way to
          // retry (a freed seat lets them in) and a way out.
          <ActivityFullCard
            retrying={retrying}
            onRetry={retry}
            onUseAnotherCode={() => navigate("/activity/join")}
          />
        ) : (
          <>
            <div className={cn(STUDENT_CARD_CLASS, "w-full p-5 sm:p-6")}>
              <WaitingLobby
                activity={activity}
                studentName={session.name}
                isPaused={isRealActivity ? livePaused : classPaused}
                connection={lobbyConnection}
                // Real activities only. The demo has no teacher socket, so
                // it is structurally always "present" — the demo's job is
                // the happy path, and it gets no steering event for this.
                teacherAway={isRealActivity && !teacherPresent}
                onLeaveActivity={leaveActivity}
              />
            </div>
            {/* Demo steering is demo furniture: a real activity's lobby
                waits for a real teacher, so it renders none of this. */}
            {activity.joinCode === DEMO_JOIN_CODE && (
              <LobbyDemoControls
                onTeacherRemove={teacherRemovesStudent}
                onMatch={startMatch}
                classPaused={classPaused}
                onClassPausedChange={setClassPaused}
                wifiBlipActive={demoWifiBlip}
                onWifiBlip={triggerWifiBlip}
              />
            )}
          </>
        )
      ) : stage === "loading" ? (
        <LoadingCard />
      ) : stage === "reconnecting" && session ? (
        // Signed in, seat held, server not answering — wait it out here. The
        // lookup is already retrying on its own; the button is for a student
        // who knows their wifi came back and doesn't want to wait for the
        // next attempt.
        <ReconnectingCard studentName={session.name} onTryNow={retryLookup} />
      ) : (
        <JoinGateCard
          stage={stage}
          activity={activity}
          joinCodeParam={joinCodeParam}
          lookupState={lookup.state}
          code={code}
          onCodeChange={setCode}
          name={name}
          onNameChange={setName}
          removedNotice={removedNotice}
          onJoinActivity={handleJoinActivity}
          onDeliverLookup={deliverLookup}
        />
      )}
    </div>
  );
}
