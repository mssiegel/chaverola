import { z } from "zod";

import {
  AUTO_MATCH_SECONDS,
  EMAIL_MAX_CHARS,
  EMAIL_PATTERN,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_MAX_CHARS,
  SCENE_MAX_CHARS,
  SCENE_MAX_WORDS,
} from "@chaverola/shared";
import type {
  ActivitySettings,
  ApiFieldIssue,
  CreateActivityRequest,
} from "@chaverola/shared";

/*
  zod lives server-side only (the client keeps its friendly per-field form
  validation) and every limit is read from @chaverola/shared — the same
  numbers the form enforces, so the form can't accept what we reject.
  Settings bounds are REJECTED, not clamped: the client already snaps values
  into range, so anything out of range here is a broken caller, not a user.
*/

const characterInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Every character needs a name.")
    .max(NAME_MAX_CHARS, `Character names max out at ${NAME_MAX_CHARS} chars.`),
  // A loose length cap, not grapheme validation — ZWJ emoji run long in
  // UTF-16 units, and a wrong-but-short string renders harmlessly.
  emoji: z
    .string()
    .trim()
    .min(1, "Omit emoji instead of sending it blank.")
    .max(32, "That emoji field is too long.")
    .optional(),
});

/** Also the socket's settings:update validator — the full-replace payload
 *  is exactly the settings object the create request carries. */
export const activitySettingsSchema = z.object({
  revealNames: z.boolean(),
  rematchWarning: z.boolean(),
  autoMatch: z.boolean(),
  autoMatchSeconds: z
    .number()
    .int()
    .min(AUTO_MATCH_SECONDS.min)
    .max(AUTO_MATCH_SECONDS.max)
    // On the step grid too (min is itself a step multiple) — same
    // broken-caller reasoning as the bounds.
    .multipleOf(AUTO_MATCH_SECONDS.step),
}) satisfies z.ZodType<ActivitySettings>;

/** The socket's activity:update-email validator — the same limits the create
 *  request's optional field uses, plus an explicit null for "clear it". A
 *  blank string is rejected on purpose: clearing travels as null, so an empty
 *  input box can never be mistaken for an address. */
export const teacherEmailUpdateSchema = z.union([
  z.null(),
  z
    .string()
    .trim()
    .min(1, "Send null instead of a blank email.")
    .max(EMAIL_MAX_CHARS, "That email address is too long.")
    .regex(EMAIL_PATTERN, "That doesn't look like an email address."),
]);

export const createActivityRequestSchema = z.object({
  hostName: z
    .string()
    .trim()
    .min(1, "The host name is required.")
    .max(NAME_MAX_CHARS, `Host names max out at ${NAME_MAX_CHARS} chars.`),
  characters: z
    .array(characterInputSchema)
    .min(MIN_CHARACTERS, `At least ${MIN_CHARACTERS} characters.`)
    .max(MAX_CHARACTERS, `At most ${MAX_CHARACTERS} characters.`)
    .superRefine((characters, ctx) => {
      // Duplicates flagged on the later row — the same rule (trimmed,
      // case-insensitive) and the same row choice as the setup form.
      const seen = new Set<string>();
      characters.forEach((character, index) => {
        const key = character.name.toLowerCase();
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            message: "Two characters can't share a name.",
            path: [index, "name"],
          });
        } else {
          seen.add(key);
        }
      });
    }),
  scenario: z
    .string()
    .trim()
    .min(1, "Omit scenario instead of sending it blank.")
    .max(SCENE_MAX_CHARS, `The scene maxes out at ${SCENE_MAX_CHARS} chars.`)
    .refine(
      (scene) => scene.split(/\s+/).length <= SCENE_MAX_WORDS,
      `The scene maxes out at ${SCENE_MAX_WORDS} words.`
    )
    .optional(),
  teacherEmail: z
    .string()
    .trim()
    .max(EMAIL_MAX_CHARS, "That email address is too long.")
    .regex(EMAIL_PATTERN, "That doesn't look like an email address.")
    .optional(),
  settings: activitySettingsSchema,
}) satisfies z.ZodType<CreateActivityRequest>;
// ^ The drift pin: if the schema's output ever drifts from the shared wire
//   type, this line is a compile error.

/** Flatten a ZodError into the envelope's zod-style issues[]. */
export function toFieldIssues(error: z.ZodError): ApiFieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}
