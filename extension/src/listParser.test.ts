import { describe, expect, it } from "vitest";
import { parseShoppingList } from "./listParser";

describe("parseShoppingList", () => {
  it("tracks categories and skips headers and list titles", () => {
    const items = parseShoppingList("Groceries\n\n[Dairy]\nMilk\n[Produce]\nKale");
    expect(items.map((i) => [i.name, i.category])).toEqual([
      ["Milk", "Dairy"],
      ["Kale", "Produce"],
    ]);
  });

  it("parses quantities, units, fractions and notes", () => {
    const [onion, butter, sugar] = parseShoppingList(
      "1 large Sweet Onion (finely chopped)\n1/2 cup Butter\n1 1/2 cups Sugar",
    );
    expect(onion).toMatchObject({ quantity: 1, name: "large Sweet Onion", notes: "finely chopped" });
    expect(butter).toMatchObject({ quantity: 0.5, unit: "cup", name: "Butter" });
    expect(sugar).toMatchObject({ quantity: 1.5, unit: "cups", name: "Sugar" });
  });

  it("strips bullets and numbering", () => {
    const names = parseShoppingList("- Eggs\n* Bread\n• Cheese\n1. Milk\n2) Butter").map((i) => i.name);
    expect(names).toEqual(["Eggs", "Bread", "Cheese", "Milk", "Butter"]);
  });
});
