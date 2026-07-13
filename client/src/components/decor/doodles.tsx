import { cn } from "@/lib/utils";

/**
 * Hand-drawn outline doodles for the student-world backdrop
 * (DriftingDoodles.tsx). Deliberately wobbly: curves instead of straight
 * segments, strokes that don't quite meet, asymmetric features. All share one
 * contract — 64×64 viewBox, currentColor stroke, width from the parent — so
 * the drift layer can size and tint them uniformly.
 */

export type DoodleComponent = (props: {
  className?: string;
}) => React.ReactElement;

function DoodleSvg({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("block h-auto w-full", className)}
    >
      {children}
    </svg>
  );
}

export const GhostDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M13 50 C13 35 14 23 20 15 C27 9 38 9 44 15 C50 22 51 35 51 49 C47 45 44 46 41 51 C38 46 35 45 32 50 C29 45 26 45 23 50 C20 46 16 46 13 50" />
    <circle cx="26" cy="27" r="2.2" fill="currentColor" stroke="none" />
    <circle cx="37" cy="29" r="2.2" fill="currentColor" stroke="none" />
    <path d="M29 37 Q32 40 35 37" />
  </DoodleSvg>
);

export const BookDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M32 18 C26 13 16 12 9 15 C9 30 9 40 10 48 C17 45 26 46 32 51" />
    <path d="M32 18 C38 13 48 12 55 15 C55 30 55 40 54 48 C47 45 38 46 32 51" />
    <path d="M32 20 C32 30 32 40 32 49" />
    <path d="M15 22 C20 21 24 22 27 24" />
    <path d="M37 24 C40 22 44 21 49 22" />
  </DoodleSvg>
);

export const CrownDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M12 46 C11 38 10 29 9 21 C14 27 19 28 23 23 C26 19 29 15 32 12 C35 15 38 19 41 23 C45 28 50 27 55 21 C54 29 53 38 52 46 C39 43 25 43 12 46" />
    <circle cx="23" cy="38" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="41" cy="38" r="1.8" fill="currentColor" stroke="none" />
  </DoodleSvg>
);

export const FeatherDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M48 11 C51 25 43 42 24 50 C20 42 22 27 32 18 C37 14 42 12 48 11" />
    <path d="M45 16 C36 26 28 37 21 49 C19 53 17 55 15 57" />
  </DoodleSvg>
);

export const MaskDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M16 12 C26 16 38 16 48 12 C50 24 49 35 44 43 C40 49 24 49 20 43 C15 35 14 24 16 12" />
    <path d="M23 25 C25 23 28 23 30 25" />
    <path d="M35 25 C37 23 40 23 42 25" />
    <path d="M22 32 C27 40 37 40 42 32" />
    <path d="M15 15 C11 17 8 21 7 25" />
    <path d="M49 15 C53 17 56 21 57 25" />
  </DoodleSvg>
);

export const SparkleDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M32 13 C33 23 36 28 46 30 C36 33 33 38 32 48 C31 38 28 33 18 31 C28 28 31 23 32 13" />
  </DoodleSvg>
);

export const PencilDoodle: DoodleComponent = ({ className }) => (
  <DoodleSvg className={className}>
    <path d="M17 47 C16 43 17 40 19 37 C25 28 31 21 38 14 C41 16 45 19 47 22 C41 30 34 38 26 45 C23 47 20 48 17 47" />
    <path d="M22 39 C24 40 27 42 29 44" />
    <path d="M35 17 C38 19 42 22 44 25" />
  </DoodleSvg>
);
