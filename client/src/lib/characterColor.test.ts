import { describe, expect, it } from "vitest";

import type { Participant } from "@/types/chat";

import {
  assignCharacterColors,
  selfFirstCharacterColors,
} from "./characterColor";

function participant(characterId: string): Participant {
  return {
    id: `student-${characterId}`,
    realName: characterId,
    character: { id: characterId, name: characterId },
  };
}

describe("assignCharacterColors", () => {
  it("assigns tokens by first appearance and keeps repeats stable", () => {
    const colors = assignCharacterColors(["hero", "rival", "hero", "friend"]);
    expect(colors.get("hero")).toBe("var(--char-1)");
    expect(colors.get("rival")).toBe("var(--char-2)");
    expect(colors.get("friend")).toBe("var(--char-3)");
  });

  it("wraps around after the eight tokens", () => {
    const keys = ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9"];
    const colors = assignCharacterColors(keys);
    expect(colors.get("k9")).toBe("var(--char-1)");
  });
});

describe("selfFirstCharacterColors", () => {
  it("always seeds the viewer's own character green", () => {
    const self = participant("hero");
    const colors = selfFirstCharacterColors(self, [
      participant("rival"),
      self,
      participant("friend"),
    ]);
    // The recorded rule: "you" are always green (--char-1), peers follow in
    // participant order.
    expect(colors.get("hero")).toBe("var(--char-1)");
    expect(colors.get("rival")).toBe("var(--char-2)");
    expect(colors.get("friend")).toBe("var(--char-3)");
  });
});
