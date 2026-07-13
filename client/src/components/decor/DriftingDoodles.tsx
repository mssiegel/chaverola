import { cn } from "@/lib/utils";

import {
  BookDoodle,
  CrownDoodle,
  FeatherDoodle,
  GhostDoodle,
  MaskDoodle,
  PencilDoodle,
  SparkleDoodle,
  type DoodleComponent,
} from "./doodles";

interface DoodleSpec {
  id: string;
  Doodle: DoodleComponent;
  /** Horizontal anchor (left), kept within 4%–88% so drift can't overflow. */
  x: string;
  /** Horizontal travel over one full fall — negative drifts left. */
  driftX: string;
  /** Fall time in seconds (45–90: slow enough to feel ambient). */
  duration: number;
  /** Negative delay pre-scrubs the loop so the sky is full at first paint. */
  delay: number;
  /** Rendered width in px. Keep ≤ 96 (the keyframes' offscreen margin). */
  size: number;
  opacity: number;
  /** Rotation sway amplitude (deg) and period (s) — independent of the fall. */
  sway: number;
  swayDuration: number;
  /** Static scatter position/tilt used when prefers-reduced-motion is on. */
  restY: string;
  restRotate: number;
  hideOnMobile?: boolean;
}

/**
 * Deterministic, hand-tuned config (no randomness): art-directable against
 * the mock, stable in screenshots, and immune to unlucky clustering. Delays
 * sit at spread-out fractions of each duration so first paint shows doodles
 * along the whole path.
 */
const DOODLES: DoodleSpec[] = [
  // prettier-ignore
  { id: "ghost-1", Doodle: GhostDoodle, x: "6%", driftX: "4vw", duration: 68, delay: -8, size: 72, opacity: 0.75, sway: 7, swayDuration: 7, restY: "10vh", restRotate: -8 },
  // prettier-ignore
  { id: "book-1", Doodle: BookDoodle, x: "14%", driftX: "-3vw", duration: 84, delay: -55, size: 84, opacity: 0.65, sway: 5, swayDuration: 8.5, restY: "72vh", restRotate: 6 },
  // prettier-ignore
  { id: "feather-1", Doodle: FeatherDoodle, x: "84%", driftX: "-5vw", duration: 58, delay: -22, size: 64, opacity: 0.75, sway: 9, swayDuration: 6, restY: "42vh", restRotate: 14 },
  // prettier-ignore
  { id: "crown-1", Doodle: CrownDoodle, x: "38%", driftX: "2vw", duration: 76, delay: -68, size: 60, opacity: 0.55, sway: 6, swayDuration: 7.5, restY: "84vh", restRotate: -5 },
  // prettier-ignore
  { id: "mask-1", Doodle: MaskDoodle, x: "68%", driftX: "3vw", duration: 62, delay: -40, size: 76, opacity: 0.75, sway: 6, swayDuration: 6.5, restY: "60vh", restRotate: 9 },
  // prettier-ignore
  { id: "sparkle-1", Doodle: SparkleDoodle, x: "28%", driftX: "-2vw", duration: 48, delay: -14, size: 34, opacity: 0.65, sway: 10, swayDuration: 5, restY: "24vh", restRotate: 0 },
  // prettier-ignore
  { id: "ghost-2", Doodle: GhostDoodle, x: "52%", driftX: "-4vw", duration: 88, delay: -30, size: 48, opacity: 0.5, sway: 6, swayDuration: 8, restY: "30vh", restRotate: 10, hideOnMobile: true },
  // prettier-ignore
  { id: "book-2", Doodle: BookDoodle, x: "88%", driftX: "-2vw", duration: 72, delay: -62, size: 56, opacity: 0.55, sway: 4, swayDuration: 9, restY: "88vh", restRotate: -10, hideOnMobile: true },
  // prettier-ignore
  { id: "pencil-1", Doodle: PencilDoodle, x: "22%", driftX: "5vw", duration: 66, delay: -47, size: 52, opacity: 0.55, sway: 8, swayDuration: 6.5, restY: "52vh", restRotate: -14, hideOnMobile: true },
  // prettier-ignore
  { id: "sparkle-2", Doodle: SparkleDoodle, x: "76%", driftX: "2vw", duration: 52, delay: -36, size: 26, opacity: 0.55, sway: 10, swayDuration: 5.5, restY: "16vh", restRotate: 0, hideOnMobile: true },
  // prettier-ignore
  { id: "crown-2", Doodle: CrownDoodle, x: "46%", driftX: "-3vw", duration: 80, delay: -12, size: 44, opacity: 0.45, sway: 5, swayDuration: 7, restY: "6vh", restRotate: 7, hideOnMobile: true },
];

/**
 * The slowly falling white doodles behind the student world. Purely
 * decorative: hidden from the accessibility tree, never intercepts input,
 * and freezes into a static scatter under prefers-reduced-motion (see the
 * .doodle rules in index.css). Mount inside a fixed full-viewport backdrop.
 */
export function DriftingDoodles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {DOODLES.map(({ Doodle, ...d }) => (
        <div
          key={d.id}
          className={cn("doodle", d.hideOnMobile && "hidden sm:block")}
          style={
            {
              "--doodle-x": d.x,
              "--doodle-drift-x": d.driftX,
              "--doodle-duration": `${d.duration}s`,
              "--doodle-delay": `${d.delay}s`,
              "--doodle-sway": `${d.sway}deg`,
              "--doodle-sway-duration": `${d.swayDuration}s`,
              "--doodle-rest-y": d.restY,
              "--doodle-rest-rotate": `${d.restRotate}deg`,
              width: d.size,
              opacity: d.opacity,
            } as React.CSSProperties
          }
        >
          <span className="doodle-inner">
            <Doodle />
          </span>
        </div>
      ))}
    </div>
  );
}
