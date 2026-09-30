import { describe, expect, it } from "vitest";
import { calculateSimilarity, diceCoefficient, findBestMatch } from "./similarity";

describe("diceCoefficient", () => {
  it("matches the string-similarity package's scores", () => {
    expect(diceCoefficient("healed", "sealed")).toBe(0.8);
    expect(diceCoefficient("french", "quebec")).toBe(0);
    expect(diceCoefficient("a", "a")).toBe(1);
    expect(diceCoefficient("a", "b")).toBe(0);
    expect(diceCoefficient("green bean", "greenbean")).toBe(1);
  });
});

describe("findBestMatch", () => {
  it("returns the highest-rated candidate", () => {
    expect(findBestMatch("bnanana", ["apple", "banana", "bread"]).match).toBe("banana");
  });
});

describe("calculateSimilarity", () => {
  it("is 1 for identical strings and drops with each edit", () => {
    expect(calculateSimilarity("milk", "milk")).toBe(1);
    expect(calculateSimilarity("milk", "silk")).toBe(0.75);
    expect(calculateSimilarity("", "")).toBe(1);
  });
});
