import { useState } from "react";
import { Loader2, Timer, UserPlus, UsersRound, WifiOff } from "lucide-react";

import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import { AccentIconChip } from "@/components/Teacher/ActivitySetup/FormSection";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { DEMO_JOIN_CODE } from "@/mockData";
import type { HostedActivity } from "@/types/activity";

import { ChatsInProgressSection } from "./ChatsInProgressSection";
import { CollapsibleSection, CountPill } from "./CollapsibleSection";
import { CompletedChatsSection } from "./CompletedChatsSection";
import { confirmCopy, type PendingAction } from "./confirmCopy";
import type { HostDemoTriggers, HostEngine } from "./hostEngine";
import { HostHeader } from "./HostHeader";
import { listNames } from "./hostWorld";
import { JoiningInstructions } from "./JoiningInstructions";
import { LiveSettingsPanel } from "./LiveSettingsPanel";
import { PairingPanel } from "./PairingPanel";

interface HostActivityDashboardProps {
  activity: HostedActivity;
  onActivityChange: (activity: HostedActivity) => void;
  /** The world behind the page — the demo simulation or the live socket. */
  engine: HostEngine;
  /** The steering panel's triggers; the demo wrapper passes them, the live
   *  page never does. */
  demoTriggers?: HostDemoTriggers;
}

/**
 * The teacher's private control room for a running activity. Never projected
 * or shared with the class — if students saw the queue and the pairings, the
 * who-am-I-chatting-with mystery would be over (see DECISIONS.md → the
 * no-projection principle).
 *
 * Two layouts live here. The `1234` demo keeps the full round: on phones
 * it's stacked minimizable sections; on desktop the pairing queue becomes a
 * sticky left rail beside the chats. A REAL activity shows the live queue
 * and nothing that can't act yet — no pairing affordances and no chat
 * sections until matching ships (founder call, 2026-07-19; see
 * DECISIONS.md → "Teacher live activity page").
 */
export function HostActivityDashboard({
  activity,
  onActivityChange,
  engine,
  demoTriggers,
}: HostActivityDashboardProps) {
  // Only the `1234` demo has a working simulation to steer; real activities
  // run the live socket engine, where matching doesn't exist yet.
  const isDemo = activity.joinCode === DEMO_JOIN_CODE;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  // Set only when End-all itself turned auto-match off — the banner offers
  // the one-tap undo for that specific moment, not for every off state.
  const [autoMatchHoldNotice, setAutoMatchHoldNotice] = useState(false);

  const setAutoMatch = (autoMatch: boolean) => {
    if (activity.settings.autoMatch === autoMatch) return;
    onActivityChange({
      ...activity,
      settings: { ...activity.settings, autoMatch },
    });
  };

  // Turning auto-match back on from ANY surface — the banner's button, the
  // rail's switch, the settings panel — retires the hold notice. Adjusted
  // during render (not an effect), so a later unrelated off-flip in the
  // settings panel can't resurrect a stale banner.
  const [prevAutoMatchOn, setPrevAutoMatchOn] = useState(
    activity.settings.autoMatch
  );
  if (activity.settings.autoMatch !== prevAutoMatchOn) {
    setPrevAutoMatchOn(activity.settings.autoMatch);
    if (activity.settings.autoMatch) setAutoMatchHoldNotice(false);
  }

  // Selection is derived against the live queue: a student who got matched
  // away, removed, or marked reconnecting (unmatchable — founder call)
  // simply falls out of it.
  const validSelectedIds = selectedIds.filter((id) =>
    engine.waiting.some((s) => s.id === id && s.connection === "connected")
  );
  const maxGroupSize = Math.min(4, activity.characters.length);

  const toggleSelect = (studentId: string) => {
    setSelectedIds(
      validSelectedIds.includes(studentId)
        ? validSelectedIds.filter((id) => id !== studentId)
        : validSelectedIds.length < maxGroupSize
          ? [...validSelectedIds, studentId]
          : validSelectedIds
    );
  };

  // Setting #3: the rematch heads-up fires only when the selection would be
  // an exact rerun — every selected student's previous chat was exactly the
  // others. A partial overlap pairs silently, and nothing is ever blocked.
  let rematchWarning: string | null = null;
  if (
    activity.settings.rematchWarning &&
    validSelectedIds.length >= 2 &&
    engine.isExactRematch(validSelectedIds)
  ) {
    // `validSelectedIds` is derived from `engine.waiting`, so the lookup holds.
    const names = validSelectedIds.map(
      (id) => engine.waiting.find((s) => s.id === id)!.realName
    );
    rematchWarning = `${listNames(names)} just chatted ${
      names.length === 2 ? "with each other" : "together"
    }. You can still pair them, this is only a heads-up.`;
  }

  const startSelectedChat = () => {
    if (validSelectedIds.length < 2) return;
    engine.startChat(validSelectedIds);
    setSelectedIds([]);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "remove-from-queue") {
      engine.removeFromQueue(pendingAction.student.id);
    } else if (pendingAction.kind === "remove-from-chat") {
      engine.removeFromChat(
        pendingAction.chat.id,
        pendingAction.participant.id
      );
    } else if (pendingAction.kind === "pause-all") {
      engine.pauseAllChats();
    } else {
      // End-all is the round-closer: end every chat, then hold auto-match so
      // nobody gets re-paired into a round the teacher just closed. The
      // setting is re-read at confirm time — already off means no flip and
      // no banner.
      engine.endAllChats();
      if (activity.settings.autoMatch) {
        setAutoMatch(false);
        setAutoMatchHoldNotice(true);
      }
    }
    setPendingAction(null);
  };

  // An empty queue means two very different things: everyone's mid-chat, or
  // (on a fresh real activity) nobody has joined at all — the copy in the
  // header and the rail must not claim chats that don't exist.
  const noStudentsYet =
    engine.waiting.length === 0 &&
    engine.chatsInProgress.length === 0 &&
    engine.completedChats.length === 0;

  const pairingPanel = (
    <PairingPanel
      waiting={engine.waiting}
      pairing={isDemo}
      noStudentsYet={noStudentsYet}
      selectedIds={validSelectedIds}
      onToggleSelect={toggleSelect}
      maxGroupSize={maxGroupSize}
      onStartChat={startSelectedChat}
      onPairEveryone={engine.pairEveryone}
      onRequestRemove={(student) =>
        setPendingAction({ kind: "remove-from-queue", student })
      }
      rematchWarning={rematchWarning}
      rematchNotice={engine.rematchNotice}
      onDismissRematchNotice={engine.dismissRematchNotice}
      leftoverStudentId={engine.leftoverStudentId}
      autoMatchOn={activity.settings.autoMatch}
      autoMatchSeconds={activity.settings.autoMatchSeconds}
      paused={engine.paused}
      onAutoMatchChange={setAutoMatch}
      showHoldNotice={autoMatchHoldNotice && !activity.settings.autoMatch}
      onDismissHoldNotice={() => setAutoMatchHoldNotice(false)}
    />
  );

  // On a real activity the "Everyone's chatting" branch is unreachable —
  // with no chats, an empty queue always means nobody's joined.
  const waitingHint =
    engine.waiting.length === 0
      ? noStudentsYet
        ? "No students yet. Share the pin to let them in"
        : "Everyone's chatting. The queue refills as chats end"
      : `${engine.waiting.length} students waiting`;

  const reconnecting = engine.connection === "reconnecting";

  return (
    <div className="flex flex-col gap-5">
      <HostHeader
        activity={activity}
        waitingCount={engine.waiting.length}
        noStudentsYet={noStudentsYet}
      />

      <JoiningInstructions joinCode={activity.joinCode} />

      {/* On real activities too — founder call. Until the edit-sync feature
          lands the edits are local-only there (students' lobbies keep the
          server's copy, a refresh reverts); see DECISIONS.md → "The
          live-settings panel stays on real activities". */}
      <LiveSettingsPanel
        activity={activity}
        characterIdsInUse={engine.characterIdsInUse}
        onActivityChange={onActivityChange}
      />

      {isDemo ? (
        /* The demo's full round. Desktop: the pairing queue is a sticky rail
           beside the chats — the teacher watches the lobby refill while
           monitoring chats. It never disappears at zero; students come back
           to it. */
        <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          {/* Sticky lives on the aside (a grid item sticks within its full-height
              grid area) and needs the grid's items-start — a stretched item has
              no room to travel. top-28 clears the under-navbar bars (demo banner
              / condensed waiting bar end ≈104-108px) with the usual 8px gap.
              The 11rem cap is 7rem above (the stuck offset) + 4rem below (the
              page's pb-16 tail): with the demo controls inside the chats column,
              the rail then stays pinned for the page's entire scroll depth. */}
          <aside className="sticky top-28 hidden lg:block">
            {/* Top padding sits on the header, not the scroller: the panel's
                pinned CTAs stick to the scrollport top, and scroller padding
                would hold them below the clip line with rows peeking through. */}
            <div className="scroll-soft max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl border border-border bg-card px-5 pb-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3 pt-5">
                <AccentIconChip accent="grape" icon={UsersRound} />
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  Pair your students
                  <CountPill count={engine.waiting.length} />
                </h2>
              </div>
              {pairingPanel}
            </div>
          </aside>

          <div className="lg:hidden">
            <CollapsibleSection
              title="Pair your students"
              icon={UsersRound}
              accent="grape"
              count={engine.waiting.length}
              collapsedHint={waitingHint}
            >
              {pairingPanel}
            </CollapsibleSection>
          </div>

          <div className="mt-5 flex flex-col gap-5 lg:mt-0">
            <ChatsInProgressSection
              chats={engine.chatsInProgress}
              activity={activity}
              studentsChattingCount={engine.studentsChattingCount}
              waitingCount={engine.waiting.length}
              onEndChat={engine.endChat}
              onRequestEndAll={() => setPendingAction({ kind: "end-all" })}
              paused={engine.paused}
              onRequestPauseAll={() => setPendingAction({ kind: "pause-all" })}
              onResumeAll={engine.resumeAllChats}
              onRequestRemoveParticipant={(chat, participant) =>
                setPendingAction({
                  kind: "remove-from-chat",
                  chat,
                  participant,
                })
              }
              onPairEveryone={engine.pairEveryone}
            />

            <CompletedChatsSection
              chats={engine.completedChats}
              activity={activity}
            />

            {/* Demo steering for what a real classroom would do on its own —
                demo only; a teacher's real activity gets no demo furniture.
                Inside the chats column (not below the grid) so the page ends
                where the grid ends — that's what lets the rail stay stuck for
                the whole scroll. Same visual spot on phones. */}
            {demoTriggers && (
              <DemoControlsPanel caption="A real class does all this by itself.">
                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                  <EventButton
                    onClick={demoTriggers.triggerJoin}
                    disabled={!demoTriggers.canTriggerJoin}
                    icon={<UserPlus className="size-4" />}
                  >
                    A student joins
                  </EventButton>
                  <EventButton
                    onClick={demoTriggers.fastForwardClocks}
                    disabled={
                      !engine.chatsInProgress.some(
                        (c) => c.autoEndSecondsLeft !== null
                      )
                    }
                    icon={<Timer className="size-4" />}
                  >
                    Fast-forward clocks
                  </EventButton>
                  <EventButton
                    onClick={demoTriggers.triggerWifiBlip}
                    disabled={!demoTriggers.canTriggerWifiBlip}
                    icon={<WifiOff className="size-4" />}
                  >
                    A student's wifi blips
                  </EventButton>
                </div>
              </DemoControlsPanel>
            )}
          </div>
        </div>
      ) : (
        /* A real activity: the live queue is the whole show until matching
           ships — no chat sections, no pairing affordances (founder call).
           While the teacher's own connection is down, the banner says so and
           the last-known queue stays readable (but not actionable) under it. */
        <>
          {reconnecting && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
            >
              <Loader2
                aria-hidden
                className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none"
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">
                  Reconnecting to your class…
                </span>{" "}
                The queue below is from right before you lost connection. It
                catches up as soon as you're back.
              </span>
            </div>
          )}
          <div
            className={cn(
              reconnecting && "pointer-events-none opacity-60 select-none"
            )}
          >
            <CollapsibleSection
              title="Who's joined"
              icon={UsersRound}
              accent="grape"
              count={engine.waiting.length}
              collapsedHint={waitingHint}
            >
              {pairingPanel}
            </CollapsibleSection>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onConfirm={confirmPendingAction}
        {...confirmCopy(pendingAction, activity.settings.autoMatch)}
      />
    </div>
  );
}
