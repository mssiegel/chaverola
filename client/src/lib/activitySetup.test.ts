import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHostedActivity,
  defaultActivityDraft,
  readActivityDraft,
  validateActivityDraft,
  type ActivityDraft,
} from "./activitySetup";

function draftWith(overrides: Partial<ActivityDraft>): ActivityDraft {
  return {
    ...defaultActivityDraft(),
    characters: [{ name: "Caesar's ghost" }, { name: "Brutus" }],
    hostName: "Ms. Cohen",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateActivityDraft", () => {
  it("passes a complete draft", () => {
    expect(validateActivityDraft(draftWith({}))).toEqual([]);
  });

  it("requires two filled characters, pointing at the first empty row", () => {
    const problems = validateActivityDraft(
      draftWith({ characters: [{ name: "Brutus" }, { name: "   " }] })
    );
    expect(problems.map((p) => p.field)).toContain("character-1");
  });

  it("flags a duplicate name (trimmed, case-insensitive) on the later row", () => {
    const problems = validateActivityDraft(
      draftWith({ characters: [{ name: "Brutus" }, { name: " BRUTUS " }] })
    );
    expect(problems.map((p) => p.field)).toEqual(["character-1"]);
  });

  it("requires the hosted-by name", () => {
    const problems = validateActivityDraft(draftWith({ hostName: "  " }));
    expect(problems.map((p) => p.field)).toEqual(["hostName"]);
  });

  it("accepts an empty email but rejects a malformed one", () => {
    expect(validateActivityDraft(draftWith({ teacherEmail: "" }))).toEqual([]);
    const problems = validateActivityDraft(
      draftWith({ teacherEmail: "not.an.email" })
    );
    expect(problems.map((p) => p.field)).toEqual(["teacherEmail"]);
  });
});

describe("readActivityDraft (sessionStorage sanitizing)", () => {
  it("falls back to a fresh draft on corrupt JSON", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => "not json at all {{",
    });
    expect(readActivityDraft()).toEqual(defaultActivityDraft());
  });

  it("clamps and snaps out-of-range stored values", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () =>
        JSON.stringify({
          characters: [
            { name: "x".repeat(99) },
            { name: "Brutus" },
            { name: "Cleo" },
            { name: "Antony" },
            { name: "One row too many" },
          ],
          settings: { autoEndMinutes: 500, autoMatchSeconds: 7 },
        }),
    });
    const draft = readActivityDraft();
    expect(draft.characters).toHaveLength(4);
    expect(draft.characters[0]!.name).toHaveLength(30);
    expect(draft.settings.autoEndMinutes).toBe(30);
    // 7 snaps onto the 5-step grid that counts from 5.
    expect(draft.settings.autoMatchSeconds).toBe(5);
  });
});

describe("buildHostedActivity", () => {
  it("slugs names into unique ids and keeps emoji only when set", () => {
    const activity = buildHostedActivity(
      draftWith({
        characters: [
          { name: " Caesar's Ghost 👻 ", emoji: "👻" },
          { name: "Brutus!" },
          { name: "Brutus?" },
        ],
      }),
      "4321"
    );
    expect(activity.characters.map((c) => c.id)).toEqual([
      "caesar-s-ghost",
      "brutus",
      "brutus-2",
    ]);
    expect(activity.characters[0]!.emoji).toBe("👻");
    expect(activity.characters[1]!.emoji).toBeUndefined();
  });

  it("drops abandoned rows and trims/omits optional fields", () => {
    const activity = buildHostedActivity(
      draftWith({
        characters: [{ name: "Ada" }, { name: "  " }, { name: "Ben" }],
        scene: "   ",
        teacherEmail: "",
      }),
      "4321"
    );
    expect(activity.characters.map((c) => c.name)).toEqual(["Ada", "Ben"]);
    expect(activity.scenario).toBeUndefined();
    expect(activity.teacherEmail).toBeUndefined();
    expect(activity.joinCode).toBe("4321");
  });
});
