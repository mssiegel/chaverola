import { useEffect, useState } from "react";

import { scaledMs } from "@/lib/demoTime";
import { randomFrom } from "@/lib/random";
import { useLatestRef } from "@/lib/useLatestRef";
import { DEMO_JOIN_CODE, type ActivityChatScenarioKey } from "@/mockData";
import type { Activity } from "@/types/activity";

import {
  DEMO_LOBBY_AUTO_MATCH_MS,
  DEMO_WIFI_BLIP_MS,
  type StudentStage,
} from "./stageTypes";

/**
 * The demo lobby's page-level furniture: the mocked activity-wide pause (it
 * survives lobby ⇄ chat ⇄ ended so the demo controls can flip it), the
 * pretend wifi blip, and the auto-match fallback. All demo-only — a real
 * activity gets its pause and connection state from the presence hook, and a
 * real teacher does the matching via the backend. Everything here runs
 * through `scaledMs` because it's pure simulation; live socket timing is
 * never compressed.
 */
export function useDemoLobby({
  stage,
  activity,
  startMatch,
}: {
  stage: StudentStage;
  activity: Activity | undefined;
  startMatch: (scenarioKey: ActivityChatScenarioKey) => void;
}) {
  // The DEMO's activity-wide pause, mocked at page level so it survives
  // lobby ⇄ chat ⇄ ended and the demo controls can flip it. Real activities
  // get theirs from the presence hook (the server pushes it) instead.
  const [classPaused, setClassPaused] = useState(false);
  // The demo lobby's pretend wifi blip: flips the pill to reconnecting for
  // a few seconds, then back. Pure simulation (hence scaledMs) — on real
  // activities the pill is driven by the live presence state instead.
  const [demoWifiBlip, setDemoWifiBlip] = useState(false);

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

  useEffect(() => {
    if (!demoWifiBlip) return;
    const timer = setTimeout(
      () => setDemoWifiBlip(false),
      scaledMs(DEMO_WIFI_BLIP_MS)
    );
    return () => clearTimeout(timer);
  }, [demoWifiBlip]);

  const triggerWifiBlip = () => setDemoWifiBlip(true);

  return { classPaused, setClassPaused, demoWifiBlip, triggerWifiBlip };
}
