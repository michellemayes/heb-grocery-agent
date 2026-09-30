import { describe, expect, it } from "vitest";
import { buildSearchQuery, buildSearchUrl, pickBestMatch, scoreMatch } from "./searchQuery";

const query = (name: string) => buildSearchQuery({ raw: name, name });

describe("buildSearchQuery", () => {
  it.each([
    ["One head of kale, chard, or collards", "kale"],
    ["Chicken or Veg Broth", "Chicken Broth"],
    ["cloves garlic (minced)", "garlic"],
    ["Parmigiano", "Parmigiano"],
    ["Large Eggs or Medium Eggs", "Large Eggs"],
  ])("%s -> %s", (input, expected) => {
    expect(query(input)).toBe(expected);
  });

  it("falls back to the original name rather than returning nothing", () => {
    expect(query("(optional)")).toBe("(optional)");
  });
});

describe("product matching", () => {
  it("scores full, partial and missing overlap", () => {
    expect(scoreMatch("sesame oil", "H-E-B Toasted Sesame Oil")).toBe(1);
    expect(scoreMatch("sesame oil", "Sesame Seeds")).toBe(0.5);
    expect(scoreMatch("sesame oil", "Olive Oil")).toBe(0.5);
    expect(scoreMatch("sesame oil", "Paper Towels")).toBe(0);
  });

  it("prefers the closest name and keeps HEB's order on ties", () => {
    expect(pickBestMatch("sesame oil", ["Sesame Seeds", "Sesame Oil"])).toBe(1);
    expect(pickBestMatch("milk", ["Whole Milk", "2% Milk"])).toBe(0);
    expect(pickBestMatch("kale", ["Spinach", "Chard"])).toBe(0);
  });
});

describe("buildSearchUrl", () => {
  it("encodes the query and adds the brand filter on request", () => {
    expect(buildSearchUrl("mac & cheese", false)).toBe("https://www.heb.com/search/?q=mac%20%26%20cheese");
    expect(buildSearchUrl("milk", true)).toBe("https://www.heb.com/search/?q=milk&filter=brand%3AH-E-B");
  });
});
