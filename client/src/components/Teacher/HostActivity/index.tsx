import { useState } from "react";
import { Timer, UserPlus, UsersRound } from "lucide-react";

import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import { AccentIconChip } from "@/components/Teacher/ActivitySetup/FormSection";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DEMO_JOIN_CODE } from "@/mockData";
import type { HostedActivity } from "@/types/activity";

import { ChatsInProgressSection } from "./ChatsInProgressSection";
import { CollapsibleSection, CountPill } from "./CollapsibleSection";
import { CompletedChatsSection } from "./CompletedChatsSection";
import { confirmCopy, type PendingAction } from "./confirmCopy";
import { HostHeader } from "./HostHeader";
import { listNames } from "./hostWorld";
import { JoiningInstructions } from "./JoiningInstructions";
import { LiveSettingsPanel } from "./LiveSettingsPanel";
import { PairingPanel } from "./PairingPanel";
import { useHostActivityDemo } from "./useHostActivityDemo";

interface HostActivityDashboardProps {
  activity: HostedActivity;
  onActivityChange: (activity: HostedActivity) => void;
}

/**
 * The teacher's private control room for a running activity. Never projected
 * or shared with the class — if students saw the queue and the pairings, the
 * who-am-I-chatting-with mystery would be over (see DECISIONS.md → the
 * no-projection principle). On phones it's stacked minimizable sections; on
 * desktop the pairing queue becomes a sticky left rail beside the chats, so
 * the teacher's two mid-round jobs sit side by side.
 */
export function HostActivityDashboard({
  activity,
  onActivityChange,
}: HostActivityDashboardProps) {
  // Only the `1234` demo seeds the pretend classroom (and gets the demo
  // steering panel); a real activity runs the same engine over an empty
  // world that stays empty until the realtime feature.
  const isDemo = activity.joinCode === DEMO_JOIN_CODE;
  const demo = useHostActivityDemo(activity, isDemo);
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
  // away or removed simply falls out of it.
  const validSelectedIds = selectedIds.filter((id) =>
    demo.waiting.some((s) => s.id === id)
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
    demo.isExactRematch(validSelectedIds)
  ) {
    // `validSelectedIds` is derived from `demo.waiting`, so the lookup holds.
    const names = validSelectedIds.map(
      (id) => demo.waiting.find((s) => s.id === id)!.realName
    );
    rematchWarning = `${listNames(names)} just chatted ${
      names.length === 2 ? "with each other" : "together"
    }. You can still pair them, this is only a heads-up.`;
  }

  const startSelectedChat = () => {
    if (validSelectedIds.length < 2) return;
    demo.startChat(validSelectedIds);
    setSelectedIds([]);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "remove-from-queue") {
      demo.removeFromQueue(pendingAction.student.id);
    } else if (pendingAction.kind === "remove-from-chat") {
      demo.removeFromChat(pendingAction.chat.id, pendingAction.participant.id);
    } else if (pendingAction.kind === "pause-all") {
      demo.pauseAllChats();
    } else {
      // End-all is the round-closer: end every chat, then hold auto-match so
      // nobody gets re-paired into a round the teacher just closed. The
      // setting is re-read at confirm time — already off means no flip and
      // no banner.
      demo.endAllChats();
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
    demo.waiting.length === 0 &&
    demo.chatsInProgress.length === 0 &&
    demo.completedChats.length === 0;

  const pairingPanel = (
    <PairingPanel
      waiting={demo.waiting}
      noStudentsYet={noStudentsYet}
      selectedIds={validSelectedIds}
      onToggleSelect={toggleSelect}
      maxGroupSize={maxGroupSize}
      onStartChat={startSelectedChat}
      onPairEveryone={demo.pairEveryone}
      onRequestRemove={(student) =>
        setPendingAction({ kind: "remove-from-queue", student })
      }
      rematchWarning={rematchWarning}
      rematchNotice={demo.rematchNotice}
      onDismissRematchNotice={demo.dismissRematchNotice}
      leftoverStudentId={demo.leftoverStudentId}
      autoMatchOn={activity.settings.autoMatch}
      autoMatchSeconds={activity.settings.autoMatchSeconds}
      paused={demo.paused}
      onAutoMatchChange={setAutoMatch}
      showHoldNotice={autoMatchHoldNotice && !activity.settings.autoMatch}
      onDismissHoldNotice={() => setAutoMatchHoldNotice(false)}
    />
  );

  const waitingHint =
    demo.waiting.length === 0
      ? noStudentsYet
        ? "No students yet. Share the pin to let them in"
        : "Everyone's chatting. The queue refills as chats end"
      : `${demo.waiting.length} students waiting`;

  return (
    <div className="flex flex-col gap-5">
      <HostHeader
        activity={activity}
        waitingCount={demo.waiting.length}
        noStudentsYet={noStudentsYet}
      />

      <JoiningInstructions joinCode={activity.joinCode} />

      {/* On real activities too — founder call. Until the edit-sync feature
          lands the edits are local-only there (students' lobbies keep the
          server's copy, a refresh reverts); see DECISIONS.md → "The
          live-settings panel stays on real activities". */}
      <LiveSettingsPanel
        activity={activity}
        characterIdsInUse={demo.characterIdsInUse}
        onActivityChange={onActivityChange}
      />

      {/* Desktop: the pairing queue is a sticky rail beside the chats — the
          teacher watches the lobby refill while monitoring chats. It never
          disappears at zero; students come back to it. */}
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
                <CountPill count={demo.waiting.length} />
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
            count={demo.waiting.length}
            collapsedHint={waitingHint}
          >
            {pairingPanel}
          </CollapsibleSection>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:mt-0">
          <ChatsInProgressSection
            chats={demo.chatsInProgress}
            activity={activity}
            studentsChattingCount={demo.studentsChattingCount}
            waitingCount={demo.waiting.length}
            onEndChat={demo.endChat}
            onRequestEndAll={() => setPendingAction({ kind: "end-all" })}
            paused={demo.paused}
            onRequestPauseAll={() => setPendingAction({ kind: "pause-all" })}
            onResumeAll={demo.resumeAllChats}
            onRequestRemoveParticipant={(chat, participant) =>
              setPendingAction({ kind: "remove-from-chat", chat, participant })
            }
            onPairEveryone={demo.pairEveryone}
          />

          <CompletedChatsSection
            chats={demo.completedChats}
            activity={activity}
          />

          {/* Demo steering for what a real classroom would do on its own —
              demo only; a teacher's real activity gets no demo furniture.
              Inside the chats column (not below the grid) so the page ends
              where the grid ends — that's what lets the rail stay stuck for
              the whole scroll. Same visual spot on phones. */}
          {isDemo && (
            <DemoControlsPanel caption="A real class does all this by itself.">
              <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                <EventButton
                  onClick={demo.triggerJoin}
                  disabled={!demo.canTriggerJoin}
                  icon={<UserPlus className="size-4" />}
                >
                  A student joins
                </EventButton>
                <EventButton
                  onClick={demo.fastForwardClocks}
                  disabled={
                    !demo.chatsInProgress.some(
                      (c) => c.autoEndSecondsLeft !== null
                    )
                  }
                  icon={<Timer className="size-4" />}
                >
                  Fast-forward clocks
                </EventButton>
              </div>
            </DemoControlsPanel>
          )}
        </div>
      </div>

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
