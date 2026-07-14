import type { ReactNode } from "react";
import {
  Eye,
  Repeat2,
  SlidersHorizontal,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { AUTO_END_MINUTES, AUTO_MATCH_SECONDS } from "@/lib/activitySetup";
import { cn } from "@/lib/utils";
import type { ActivitySettings } from "@/types/activity";

import { FormSection } from "./FormSection";
import { NumberStepper } from "./NumberStepper";

interface SettingsSectionProps {
  settings: ActivitySettings;
  onChange: (changes: Partial<ActivitySettings>) => void;
}

/**
 * The four activity toggles. Everything defaults to on (the recommended
 * state), and a toggle's sub-control stays visible but disabled while it's
 * off — the teacher can see what turning it on will do, and nothing jumps
 * around. All of it stays editable while the activity runs.
 */
export function SettingsSection({ settings, onChange }: SettingsSectionProps) {
  return (
    <FormSection
      quiet
      title="Settings"
      icon={SlidersHorizontal}
      accent="mint"
      hint="These start out the way we recommend. You can change any of them while the activity runs."
    >
      <div className="divide-y divide-border/70">
        <SettingRow
          id="setting-reveal-names"
          icon={Eye}
          title="Reveal names when a chat ends"
          description="Chats are anonymous while they run. When one ends, the students in it find out who they were really talking to."
          checked={settings.revealNames}
          onCheckedChange={(revealNames) => onChange({ revealNames })}
        />

        <SettingRow
          id="setting-auto-end"
          icon={Timer}
          title="End chats on a timer"
          description="Every chat wraps up on its own after the time you pick."
          checked={settings.autoEndChats}
          onCheckedChange={(autoEndChats) => onChange({ autoEndChats })}
        >
          <SubControl label="End chats after" muted={!settings.autoEndChats}>
            <NumberStepper
              value={settings.autoEndMinutes}
              bounds={AUTO_END_MINUTES}
              disabled={!settings.autoEndChats}
              format={(v) => (v === 1 ? "1 minute" : `${v} minutes`)}
              decreaseLabel="One minute less"
              increaseLabel="One minute more"
              onChange={(autoEndMinutes) => onChange({ autoEndMinutes })}
            />
          </SubControl>
        </SettingRow>

        <SettingRow
          id="setting-rematch-warning"
          icon={Repeat2}
          title="Warn before a rematch"
          description="You get a heads-up when a pairing would put the same students together again."
          checked={settings.rematchWarning}
          onCheckedChange={(rematchWarning) => onChange({ rematchWarning })}
        />

        <SettingRow
          id="setting-auto-match"
          icon={Zap}
          title="Match students 1:1 automatically"
          description="Once two students have each waited long enough, they get paired up on their own. Nobody lands right back with their last partner."
          checked={settings.autoMatch}
          onCheckedChange={(autoMatch) => onChange({ autoMatch })}
        >
          <SubControl label="Students wait" muted={!settings.autoMatch}>
            <NumberStepper
              value={settings.autoMatchSeconds}
              bounds={AUTO_MATCH_SECONDS}
              disabled={!settings.autoMatch}
              format={(v) => `${v} seconds`}
              decreaseLabel="Five seconds less"
              increaseLabel="Five seconds more"
              onChange={(autoMatchSeconds) => onChange({ autoMatchSeconds })}
            />
          </SubControl>
        </SettingRow>
      </div>
    </FormSection>
  );
}

function SettingRow({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Title row only; the description hangs below so the icon chip and
          switch never squeeze it into a sliver on phones. */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-card text-muted-foreground"
        >
          <Icon className="size-4.5" />
        </span>
        <label
          htmlFor={id}
          className="min-w-0 flex-1 cursor-pointer font-medium text-foreground"
        >
          {title}
        </label>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      <p className="mt-1.5 ps-12 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}

function SubControl({
  label,
  muted,
  children,
}: {
  label: string;
  muted: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 ps-12">
      <span
        className={cn(
          "text-sm transition-colors",
          muted ? "text-muted-foreground/60" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
