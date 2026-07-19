import type { ReactNode } from "react";

import { EMAIL_MAX_CHARS } from "@chaverola/shared";
import { Input } from "@/components/ui/input";
import {
  NAME_COUNTER_FROM,
  NAME_MAX_CHARS,
  type SetupField,
} from "@/lib/activitySetup";
import { charCount, clampChars } from "@/lib/text";
import { cn } from "@/lib/utils";

import { FieldError, FieldLabelRow, LimitCounter } from "./FieldFeedback";

interface AboutYouFieldsProps {
  hostName: string;
  teacherEmail: string;
  /** Patches the parent draft; the name cap is clamped in here already. */
  onPatch: (changes: { hostName?: string; teacherEmail?: string }) => void;
  hostNameError?: string;
  emailError?: string;
  /** Input ids become `${idPrefix}-name` / `${idPrefix}-email`. */
  idPrefix: string;
  namePlaceholder?: string;
  /** Shown under the name field while it has no error (setup's lobby echo). */
  nameHint?: ReactNode;
  /** Setup only: lets a failed Host tap scroll to the field. */
  registerField?: (field: SetupField) => (el: HTMLElement | null) => void;
  className?: string;
}

/**
 * The hosted-by name and optional teacher email, exactly as the setup form
 * and the host page's live panel both render them.
 */
export function AboutYouFields({
  hostName,
  teacherEmail,
  onPatch,
  hostNameError,
  emailError,
  idPrefix,
  namePlaceholder,
  nameHint,
  registerField,
  className,
}: AboutYouFieldsProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div>
        <FieldLabelRow htmlFor={`${idPrefix}-name`} label="Your name">
          <LimitCounter
            count={charCount(hostName)}
            max={NAME_MAX_CHARS}
            showFrom={NAME_COUNTER_FROM}
          />
        </FieldLabelRow>
        <Input
          id={`${idPrefix}-name`}
          ref={registerField?.("hostName")}
          value={hostName}
          onChange={(event) =>
            onPatch({
              hostName: clampChars(event.target.value, NAME_MAX_CHARS),
            })
          }
          placeholder={namePlaceholder}
          aria-invalid={hostNameError ? true : undefined}
        />
        {hostNameError ? (
          <FieldError message={hostNameError} className="mt-1.5" />
        ) : (
          nameHint
        )}
      </div>

      <div>
        <FieldLabelRow
          htmlFor={`${idPrefix}-email`}
          label="Your email"
          optional
        />
        <Input
          id={`${idPrefix}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={EMAIL_MAX_CHARS}
          ref={registerField?.("teacherEmail")}
          value={teacherEmail}
          onChange={(event) => onPatch({ teacherEmail: event.target.value })}
          placeholder="you@school.org"
          aria-invalid={emailError ? true : undefined}
        />
        {emailError ? (
          <FieldError message={emailError} className="mt-1.5" />
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            We'll email you every chat from the activity once it wraps up.
          </p>
        )}
      </div>
    </div>
  );
}
