import type { GroceryListItem } from "heb-grocery-shared";

const CATEGORY_HEADER = /^\s*\[(?<category>[^[\]]+)]\s*$/;
const FRACTION_REGEX = /^(\d+)\s+(\d+)\/(\d+)$/;
const SIMPLE_FRACTION_REGEX = /^(\d+)\/(\d+)$/;

const SUPPORTED_UNITS = [
  "cup",
  "cups",
  "tsp",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "bag",
  "bags",
  "ct",
  "count",
  "can",
  "cans",
  "pkg",
  "package",
  "packages",
  "bottle",
  "bottles",
];

const QUANTITY_UNIT_REGEX = new RegExp(
  `^(?<quantity>(?:\\d+\\s+\\d+/\\d+)|(?:\\d+/\\d+)|(?:\\d+(?:\\.\\d+)?))` +
    `(?:\\s*(?<unit>${SUPPORTED_UNITS.join("|")}))?` +
    `(?:\\s+(?:of|x))?` +
    `\\s+(?<remainder>.+)$`,
  "i",
);

const BULLET_PREFIX = /^\s*(?:[-*•+]\s+|\d+[.)]\s+)?/;

const GENERIC_SECTION_HEADERS = new Set([
  "groceries",
  "grocery list",
  "shopping list",
]);

function fractionToNumber(value: string): number {
  const mixed = value.match(FRACTION_REGEX);
  if (mixed) {
    const whole = Number.parseInt(mixed[1], 10);
    const numerator = Number.parseInt(mixed[2], 10);
    const denominator = Number.parseInt(mixed[3], 10);
    return whole + numerator / denominator;
  }

  const fractionOnly = value.match(SIMPLE_FRACTION_REGEX);
  if (fractionOnly) {
    const numerator = Number.parseInt(fractionOnly[1], 10);
    const denominator = Number.parseInt(fractionOnly[2], 10);
    return numerator / denominator;
  }

  return Number.parseFloat(value);
}

function extractNotes(name: string): { cleaned: string; notes?: string } {
  const noteMatch = name.match(/\((?<note>[^)]+)\)\s*$/);
  if (!noteMatch || !noteMatch.groups) {
    return { cleaned: name.trim() };
  }

  const cleaned = name.replace(noteMatch[0], "").trim();
  return { cleaned, notes: noteMatch.groups.note.trim() };
}

export function parseShoppingList(input: string): GroceryListItem[] {
  const lines = input.split(/\r?\n/);
  const items: GroceryListItem[] = [];
  let currentCategory: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const categoryMatch = trimmed.match(CATEGORY_HEADER);
    if (categoryMatch?.groups?.category) {
      currentCategory = categoryMatch.groups.category.trim();
      continue;
    }

    if (GENERIC_SECTION_HEADERS.has(trimmed.toLowerCase())) {
      continue;
    }

    const withoutBullet = trimmed.replace(BULLET_PREFIX, "").trim();
    if (!withoutBullet) {
      continue;
    }

    const parsed: GroceryListItem = {
      raw: line,
      name: withoutBullet,
      category: currentCategory,
    };

    const quantityMatch = withoutBullet.match(QUANTITY_UNIT_REGEX);
    if (quantityMatch?.groups?.quantity) {
      parsed.quantity = fractionToNumber(quantityMatch.groups.quantity);
      if (quantityMatch.groups.unit) {
        parsed.unit = quantityMatch.groups.unit.toLowerCase();
      }

      const remainder = quantityMatch.groups.remainder?.trim() ?? "";
      if (remainder) {
        const { cleaned, notes } = extractNotes(remainder);
        parsed.name = cleaned;
        if (notes) {
          parsed.notes = notes;
        }
      }
    } else {
      const { cleaned, notes } = extractNotes(withoutBullet);
      parsed.name = cleaned;
      if (notes) {
        parsed.notes = notes;
      }
    }

    items.push(parsed);
  }

  return items;
}
