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
  WifiOff,
} from "lucide-react";

import {
  MAX_STUDENTS_PER_ACTIVITY,
  STUDENT_NAME_MAX_CHARS,
  TYPING_INDICATOR_TTL_MS,
  type Character,
  type ChatLine,
  type ChatPeer,
  type LobbyConnectionState,
} from "@chaverola/shared";

import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import type { StudentWorldOutletContext } from "@/components/layout/StudentWorldLayout";
import { ChatStage } from "@/components/Student/ChatStage";
import { LiveChatStage } from "@/components/Student/LiveChatStage";
import { WaitingLobby } from "@/components/Student/WaitingLobby";
import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/api";
import { characterLabel } from "@/lib/characterLabel";
import { scaledMs } from "@/lib/demoTime";
import { useLocaleNavigate } from "@/lib/locale";
import { nextId, randomFrom } from "@/lib/random";
import { useStudentSession } from "@/lib/studentSession";
import {
  primeActivityLookup,
  SLOW_LOOKUP_HINT_MS,
  useActivityLookup,
} from "@/lib/useActivityLookup";
import { useLatestRef } from "@/lib/useLatestRef";
import { usePageTitle } from "@/lib/usePageTitle";
import { useLobbyPresence } from "@/pages/student/useLobbyPresence";
import { useWarmUpServer } from "@/lib/useWarmUpServer";
import { cn } from "@/lib/utils";
import { NOTICE_SENDER_ID } from "@/types/chat";
import type { ChatMessage, Participant } from "@/types/chat";
import {
  DEMO_JOIN_CODE,
  DEMO_STUDENT_NAME,
  type ActivityChatScenarioKey,
} from "@/mockData";

type StudentStage =
  | "code"
  | "loading"
  | "name"
  | "lobby"
  | "chatting"
  | "ended"
  // The activity died under a seated student (deploy/restart wipe, TTL) —
  // distinct from "ended", which is a finished chat.
  | "activity-gone";

/** What went wrong with the last code the student tried. */
type CodeProblem = "not-found" | "unreachable";

/** One mock match the lobby's demo trigger fired the student into. */
interface DemoMatch {
  kind: "demo";
  /** Bumped per match so ChatStage remounts with a fresh chat every time. */
  seq: number;
  scenarioKey: ActivityChatScenarioKey;
}

/**
 * A real chat the server matched the student into (chat:started). Assembled
 * from the wire's characterIds against the fetched roster; peers carry no
 * real names by construction — the student wire never has them.
 */
interface LiveMatch {
  kind: "live";
  chatId: string;
  /** The student's own seat (realName from the session). */
  self: Participant;
  /** Peers still in the room; chat:update shrinks this. */
  peers: Participant[];
  /** Everyone ever in the room — keeps colors and lines stable. Built from
   *  the wire's everPeers, never aliased to peers: a departed member has to
   *  keep resolving or their backlog lines silently vanish. */
  everPeers: Participant[];
  /** The transcript: real lines (from chat:line and chat:started's backlog)
   *  interleaved with local membership notices ("X left the chat"). */
  messages: ChatMessage[];
  /** The one typing slot (a characterId), last writer wins. On the match
   *  state, not beside it, so every clearing invariant lives in the merge
   *  points that already exist. Expired by a TTL timer from the last
   *  heartbeat; a peer's landing message clears their own slot instantly. */
  typingPeerId: string | null;
}

type ActiveMatch = DemoMatch | LiveMatch;

/**
 * A characterId the fetched roster can't resolve (shouldn't happen — the
 * server deals from the same roster the student fetched — but the wire is
 * the wire). The room still works; only the label is a mystery.
 */
const FALLBACK_CHARACTER_NAME = "Mystery guest";

/** A wire line as a renderable message. The sender IS the characterId —
 *  participant ids in a live room are characterIds. No timestamp: the
 *  server's array order is the order, and merges preserve it. */
function toLiveMessage(line: ChatLine): ChatMessage {
  return { id: line.id, senderId: line.characterId, text: line.text };
}

const PAGE_TITLES: Record<StudentStage, string> = {
  code: "Join an Activity",
  loading: "Join an Activity",
  name: "Join an Activity",
  lobby: "Waiting Lobby",
  chatting: "Chatting",
  ended: "Chat Ended",
  "activity-gone": "Activity Ended",
};

/**
 * How long the demo lobby waits before the pretend teacher pairs the student
 * anyway, so a visitor who never touches the demo buttons still reaches a
 * chat. ~20s (founder-picked): enough time to take the lobby in first.
 * See DECISIONS.md → "The demo lobby pairs you by itself after 20 seconds".
 */
const DEMO_LOBBY_AUTO_MATCH_MS = 20_000;

/** How long the demo's pretend wifi blip keeps the reconnecting pill up —
 *  demo simulation, so it runs through scaledMs (live socket state never
 *  does). */
const DEMO_WIFI_BLIP_MS = 4_000;

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
 */
export function JoinActivityPage() {
  const { joinCode: joinCodeParam } = useParams();
  const navigate = useLocaleNavigate();
  const { setChatStudentName } = useOutletContext<StudentWorldOutletContext>();
  const { session, signIn, signOut, updateSession } = useStudentSession();

  // Wake the free-tier server the moment a student arrives, so the code
  // they're about to type resolves against a warm instance.
  useWarmUpServer();

  const {
    lookup,
    slow: slowLookup,
    deliver: deliverLookup,
  } = useActivityLookup(joinCodeParam);
  const activity = lookup.state === "found" ? lookup.activity : undefined;

  // Set by the lobby's demo match triggers (demo) or by the server's
  // chat:started (real activities, via the presence hook below).
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  // Mirrors the chat engine's ended flag up here so the stage (and with it
  // the page title) can tell chatting from ended.
  const [chatEnded, setChatEnded] = useState(false);
  // The teacher's activity-wide pause, mocked at page level so it survives
  // lobby ⇄ chat ⇄ ended. A real backend pushes this later.
  const [classPaused, setClassPaused] = useState(false);

  const isSignedIn =
    activity !== undefined && session?.joinCode === activity.joinCode;
  // The classic stage machine. The activity-gone override is layered on
  // AFTER the presence hook has had its say (`stage` below); the hook
  // itself keys off this base value.
  const baseStage: StudentStage = !joinCodeParam
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

  const isRealActivity =
    activity !== undefined && activity.joinCode !== DEMO_JOIN_CODE;

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
  const stage: StudentStage = activityGone ? "activity-gone" : baseStage;

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
  useEffect(() => {
    const resolvedToCodeEntry =
      joinCodeParam === undefined || lookup.state === "not-found";
    if (resolvedToCodeEntry && session && !activityGoneFromLookup) signOut();
  }, [joinCodeParam, lookup.state, session, signOut, activityGoneFromLookup]);

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

  const startMatch = (scenarioKey: ActivityChatScenarioKey) => {
    setChatEnded(false);
    setMatch((prev) => ({
      kind: "demo",
      seq: (prev?.kind === "demo" ? prev.seq : 0) + 1,
      scenarioKey,
    }));
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

  // Resolve a wire characterId against the fetched roster. Can't miss in
  // practice (the server deals from the roster the student fetched), but
  // the wire is the wire — an unresolvable id still renders, as a mystery.
  const resolveCharacter = (characterId: string): Character =>
    activity?.characters.find((c) => c.id === characterId) ?? {
      id: characterId,
      name: FALLBACK_CHARACTER_NAME,
    };

  // A wire peer as a room participant. Peers carry no real names by
  // construction — the student wire never has them.
  const toParticipant = (peer: ChatPeer): Participant => ({
    // characterId doubles as the participant id — unique within a chat
    // (each character is dealt once), and the only identity the student
    // wire carries.
    id: peer.characterId,
    character: resolveCharacter(peer.characterId),
    realName: "",
  });

  // Reconcile a live match with the wire's current peer list: whoever
  // disappeared gets a local "left the chat" notice and drops out of
  // `peers`; `everPeers` keeps them so colors and lines stay stable.
  const shrinkToPeers = (prev: LiveMatch, current: ChatPeer[]): LiveMatch => {
    const currentIds = new Set(current.map((p) => p.characterId));
    const gone = prev.peers.filter((p) => !currentIds.has(p.id));
    if (gone.length === 0) return prev;
    return {
      ...prev,
      peers: prev.peers.filter((p) => currentIds.has(p.id)),
      // A typist who left clears with their own departure notice.
      typingPeerId:
        prev.typingPeerId !== null && !currentIds.has(prev.typingPeerId)
          ? null
          : prev.typingPeerId,
      messages: [
        ...prev.messages,
        ...gone.map((peer): ChatMessage => ({
          id: nextId("m"),
          senderId: NOTICE_SENDER_ID,
          kind: "notice",
          text: `${characterLabel(peer)} left the chat`,
        })),
      ],
    };
  };

  // The live seat. Active through the whole seated life of a real activity
  // — lobby, chatting, and the chat-ended screen — so a matched student's
  // socket lives on and a refresh resumes into the chat; the demo (1234)
  // keeps zero network by construction. Called after the name state above
  // because its callbacks reach for it:
  // - onRemoved (the socket event, or a tombstoned token on a reconnect
  //   attempt) drives the same flow the demo button does — except the name
  //   field stays blank on real activities (founder call: most removals
  //   target a fake name, so don't hand it back for one-tap re-entry; a
  //   mistyped real name is quick to retype). Mid-chat removals land here
  //   too, so the match clears with the seat.
  // - onEnded latches the dead activity's code, which flips the stage to
  //   the activity-gone screen.
  // - onChatStarted is both the match and every resume into it; a re-send
  //   for a chat already in memory merges the missed transcript backlog,
  //   then reconciles peers instead of resetting.
  // - onChatEnded with no match in memory is the post-refresh ended screen
  //   — nothing to show, so the seat goes straight back to the queue.
  // The typing indicator's TTL: re-armed on every relayed heartbeat, so it
  // runs from the LAST one. Same pattern as submitSlowTimerRef. No cleanup
  // effect on purpose: a stray post-unmount fire is a guarded setMatch
  // no-op.
  const typingExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seated =
    baseStage === "lobby" || baseStage === "chatting" || baseStage === "ended";
  const {
    presence,
    retrying,
    retry,
    returnToLobby,
    sendChatMessage,
    sendTyping,
  } = useLobbyPresence({
    active: seated && isRealActivity && !activityGoneFromSocket,
    joinCode: activity?.joinCode,
    session,
    updateSession,
    onRemoved: () => {
      signOut();
      setName("");
      setRemovedByTeacher(true);
      setMatch(null);
      setChatEnded(false);
    },
    onEnded: () => {
      if (activity) setGoneCode(activity.joinCode);
    },
    onChatStarted: (payload) => {
      if (!session) return;
      setChatEnded(false);
      setMatch((prev) => {
        if (prev?.kind === "live" && prev.chatId === payload.chatId) {
          // A resume re-delivery of the chat already on screen — and the
          // ONLY channel that heals a blip: the chat:line fan-out skips
          // disconnected seats, so whatever was said while this phone was
          // locked exists nowhere but this backlog. Merge missed lines (by
          // id — our own echoed sends must not double) BEFORE reconciling
          // membership, so a "left the chat" notice discovered on the same
          // resume lands after the lines it follows: the true order.
          const known = new Set(prev.messages.map((m) => m.id));
          const missed = payload.lines
            .filter((line) => !known.has(line.id))
            .map(toLiveMessage);
          // The spread keeps prev.typingPeerId on purpose: the TTL covers
          // staleness, and after a real refresh `prev` is gone anyway, so
          // the indicator is simply absent until the next heartbeat ≤2s
          // later — typing is not in the backlog, by design.
          const caughtUp: LiveMatch = {
            ...prev,
            everPeers: payload.everPeers.map(toParticipant),
            messages:
              missed.length > 0 ? [...prev.messages, ...missed] : prev.messages,
          };
          return shrinkToPeers(caughtUp, payload.peers);
        }
        return {
          kind: "live",
          chatId: payload.chatId,
          self: {
            id: payload.selfCharacterId,
            character: resolveCharacter(payload.selfCharacterId),
            realName: session.name,
          },
          peers: payload.peers.map(toParticipant),
          everPeers: payload.everPeers.map(toParticipant),
          // The server's order is already correct and already capped.
          messages: payload.lines.map(toLiveMessage),
          typingPeerId: null,
        };
      });
    },
    onChatLine: (payload) => {
      setMatch((prev) => {
        if (prev?.kind !== "live" || prev.chatId !== payload.chatId) {
          return prev;
        }
        // A live line can race a resume backlog that already carried it —
        // the id dedupe makes the replay harmless.
        if (prev.messages.some((m) => m.id === payload.line.id)) return prev;
        return {
          ...prev,
          // The peer's message landing clears THEIR bubble, instantly —
          // never another typist's. The pending TTL timer stays armed: a
          // late fire can only re-null a null.
          typingPeerId:
            payload.line.characterId === prev.typingPeerId
              ? null
              : prev.typingPeerId,
          messages: [...prev.messages, toLiveMessage(payload.line)],
        };
      });
    },
    onChatUpdate: (payload) => {
      setMatch((prev) =>
        prev?.kind === "live" && prev.chatId === payload.chatId
          ? shrinkToPeers(prev, payload.peers)
          : prev
      );
    },
    onPeerTyping: (payload) => {
      if (match?.kind !== "live" || match.chatId !== payload.chatId) return;
      // Skip the object churn when the slot already shows this character.
      setMatch((prev) =>
        prev?.kind === "live" &&
        prev.chatId === payload.chatId &&
        prev.typingPeerId !== payload.characterId
          ? { ...prev, typingPeerId: payload.characterId }
          : prev
      );
      // ALWAYS re-arm, churn skipped or not — the TTL runs from the last
      // heartbeat, not the first.
      if (typingExpiryRef.current !== null) {
        clearTimeout(typingExpiryRef.current);
      }
      typingExpiryRef.current = setTimeout(() => {
        typingExpiryRef.current = null;
        setMatch((prev) =>
          prev?.kind === "live" && prev.typingPeerId !== null
            ? { ...prev, typingPeerId: null }
            : prev
        );
      }, TYPING_INDICATOR_TTL_MS);
    },
    onChatEnded: () => {
      if (match?.kind === "live") {
        setChatEnded(true);
      } else {
        // Post-refresh (or post-anything that lost the match from memory):
        // there's no chat to show an ended screen for — go straight back
        // to the queue instead of pretending.
        returnToLobby();
      }
    },
  });

  // The demo lobby's pretend wifi blip: flips the pill to reconnecting for
  // a few seconds, then back. Pure simulation (hence scaledMs) — on real
  // activities the pill is driven by the live presence state instead.
  const [demoWifiBlip, setDemoWifiBlip] = useState(false);
  useEffect(() => {
    if (!demoWifiBlip) return;
    const timer = setTimeout(
      () => setDemoWifiBlip(false),
      scaledMs(DEMO_WIFI_BLIP_MS)
    );
    return () => clearTimeout(timer);
  }, [demoWifiBlip]);

  const lobbyConnection: LobbyConnectionState =
    activity?.joinCode === DEMO_JOIN_CODE
      ? demoWifiBlip
        ? "reconnecting"
        : "connected"
      : presence === "reconnecting"
        ? "reconnecting"
        : "connected";

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
      // A fresh sign-in must not inherit a dead activity's latch — the
      // same 4-digit code can be minted again for a brand-new activity.
      setGoneCode(null);
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
          />
        ) : (
          <LiveChatStage
            key={match.chatId}
            self={match.self}
            peers={match.peers}
            everPeers={match.everPeers}
            messages={match.messages}
            typingPeerId={match.typingPeerId}
            isEnded={chatEnded}
            onSend={sendChatMessage}
            onTyping={sendTyping}
            // Leaving a live chat means leaving the activity: landing on
            // bare code entry runs the sign-out effect, and the presence
            // hook's cleanup emits lobby:leave (back-as-reset, exactly the
            // browser-back flow).
            onLeaveActivity={() => navigate("/activity/join")}
            // The ended screen's Back tap: the server returns the
            // wrapping-up seat to the queue with a fresh clock, and the
            // local match state clears.
            onBackToLobby={() => {
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
                isPaused={classPaused}
                connection={lobbyConnection}
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
                onWifiBlip={() => setDemoWifiBlip(true)}
              />
            )}
          </>
        )
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
                  maxLength={STUDENT_NAME_MAX_CHARS}
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
 * The screen for an activity that died under a seated student — a deploy or
 * restart wiped the in-memory store, or the 12h TTL reaped it. Honest about
 * the free tier instead of blaming the student's code, and the sign-out is
 * deferred to the CTA (the session is the evidence this screen exists).
 */
function ActivityGoneCard({ onEnterNewCode }: { onEnterNewCode: () => void }) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col gap-6 px-6 py-8 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8"
        )}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            This activity is over
          </h1>
          <p className="text-muted-foreground">
            Your class wrapped up, or Chaverola's server restarted and cut the
            activity short. If class is still going, ask your teacher for a
            fresh code.
          </p>
        </div>
        <Button
          size="lg"
          onClick={onEnterNewCode}
          className="w-full bg-linear-to-r from-brand-gradient-from to-brand-gradient-to hover:from-[#7d5cf5] hover:to-[#5f3fd6]"
        >
          Enter a new code
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The seat-cap screen: the student signed in, but every seat is taken.
 * Names the cap so the wall makes sense, offers a retry (someone leaving
 * frees a seat — socket.io doesn't auto-retry a middleware rejection, so
 * the button is the only way back in) and a quiet way out.
 */
function ActivityFullCard({
  retrying,
  onRetry,
  onUseAnotherCode,
}: {
  retrying: boolean;
  onRetry: () => void;
  onUseAnotherCode: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col gap-6 px-6 py-8 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8"
        )}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            This activity is full
          </h1>
          <p className="text-muted-foreground">
            An activity holds up to {MAX_STUDENTS_PER_ACTIVITY} students, and
            every spot is taken right now. If someone leaves, their spot opens
            up.
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={onRetry}
            disabled={retrying}
            className="w-full bg-linear-to-r from-brand-gradient-from to-brand-gradient-to hover:from-[#7d5cf5] hover:to-[#5f3fd6]"
          >
            {retrying ? (
              <>
                Checking for a spot…
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              </>
            ) : (
              "Try again"
            )}
          </Button>
          <button
            type="button"
            onClick={onUseAnotherCode}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Use a different code
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The lobby's demo steering: what a real teacher does from the host page —
 * matching this student into a chat (1:1 or a group of 3, so the group drop
 * behavior is demoable too) and removing them from the activity — plus a
 * wifi blip, so the reconnecting pill is demoable too. Permanent demo
 * furniture; on a real activity a backend pushes these instead. If the
 * visitor presses nothing, the auto-match fallback above pairs them anyway.
 */
function LobbyDemoControls({
  onTeacherRemove,
  onMatch,
  classPaused,
  onClassPausedChange,
  wifiBlipActive,
  onWifiBlip,
}: {
  onTeacherRemove: () => void;
  onMatch: (scenarioKey: ActivityChatScenarioKey) => void;
  classPaused: boolean;
  onClassPausedChange: (paused: boolean) => void;
  wifiBlipActive: boolean;
  onWifiBlip: () => void;
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
        <EventButton
          onWorld
          onClick={onWifiBlip}
          disabled={wifiBlipActive}
          icon={<WifiOff className="size-4" />}
        >
          Your wifi blips
        </EventButton>
        <EventButton
          onWorld
          onClick={onTeacherRemove}
          icon={<UserX className="size-4" />}
        >
          Teacher removes you
        </EventButton>
      </div>
    </DemoControlsPanel>
  );
}
