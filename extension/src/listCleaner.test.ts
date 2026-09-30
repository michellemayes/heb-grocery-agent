import { describe, expect, it } from "vitest";
import { diffLines } from "./aiCleaner";
import { applyCleanup, cleanShoppingList, getCleanupSummary } from "./listCleaner";

describe("cleanShoppingList", () => {
  it("fixes typos, removes duplicates and keeps headers", () => {
    const diff = cleanShoppingList("[Produce]\n2 bnananas\nbananas\n1 cup Milk");
    expect(applyCleanup(diff)).toBe("[Produce]\n2 bananas\n1 cup Milk");
    expect(getCleanupSummary(diff)).toMatchObject({ removed: 1, unchanged: 2 });
  });
});

describe("diffLines", () => {
  it("classifies each original line against the AI output", () => {
    const changes = diffLines(
      ["[Produce]", "Roma Tomatoes", "bnanas", "milk", "Milk"],
      ["[Produce]", "tomatoes", "bananas", "Milk"],
    );
    expect(changes.map((c) => [c.type, c.cleaned])).toEqual([
      ["unchanged", "[Produce]"],
      ["standardized", "tomatoes"],
      ["fixed", "bananas"],
      ["unchanged", "Milk"],
      ["removed", ""],
    ]);
  });
});
