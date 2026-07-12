import {
  ArrowRight,
  GraduationCap,
  LayoutGrid,
  Sparkles,
  Users,
} from "lucide-react";

import { LogoMark } from "@/components/brand/Logo";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";

/** Landing page — pick a lane: join as a student or set up as a teacher. */
export function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark size={72} />
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Chaverola
          </h1>
          <p className="max-w-md text-balance text-lg text-muted-foreground">
            A fast, game-like classroom chat. Get a character, jump in, and
            roleplay with your classmates without ever knowing who's who.
          </p>
        </div>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <RoleCard
          to="/activity/join"
          icon={<Users className="size-6" />}
          title="I'm a student"
          description="Enter a join code and start chatting in character."
          cta="Join an activity"
        />
        <RoleCard
          to="/activity/create"
          icon={<GraduationCap className="size-6" />}
          title="I'm a teacher"
          description="Create an activity, pick characters, share a code."
          cta="Create an activity"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <DemoLink
          to="/demo/student-chat"
          icon={<Sparkles className="size-4 text-brand-grape" />}
        >
          Peek at the student chatbox demo
        </DemoLink>
        <DemoLink
          to="/demo/teacher-chat"
          icon={<LayoutGrid className="size-4 text-brand-grape" />}
        >
          Peek at the teacher chat cards demo
        </DemoLink>
      </div>
    </div>
  );
}

function DemoLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <LocaleLink
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
    >
      {icon}
      {children}
      <ArrowRight className="size-4" />
    </LocaleLink>
  );
}

interface RoleCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}

function RoleCard({ to, icon, title, description, cta }: RoleCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="lg" className="mt-auto w-full">
        <LocaleLink to={to}>
          {cta}
          <ArrowRight className="size-4" />
        </LocaleLink>
      </Button>
    </div>
  );
}
