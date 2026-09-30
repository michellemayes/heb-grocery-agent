import type { GroceryListItem } from "./types";

const NUMBER_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|few|dozen|half";

const MEASURE_WORDS =
  "head|heads|bunch|bunches|clove|cloves|stalk|stalks|sprig|sprigs|" +
  "loaf|loaves|stick|sticks|slice|slices|piece|pieces|can|cans|bag|bags|" +
  "box|boxes|package|packages|pkg|bottle|bottles|jar|jars|container|containers|" +
  "cup|cups|tsp|teaspoon|teaspoons|tbsp|tablespoon|tablespoons|oz|ounce|ounces|" +
  "lb|lbs|pound|pounds|gram|grams|g|kg|pint|pints|quart|quarts|gallon|gallons";

const LEADING_NUMBER_WORD = new RegExp(`^(?:${NUMBER_WORDS})\\s+`, "i");
const LEADING_MEASURE = new RegExp(`^(?:${MEASURE_WORDS})\\s+(?:of\\s+)?`, "i");

const STOP_WORDS = new Set(["and", "or", "the", "of", "with", "for", "a", "an", "in", "to"]);

/**
 * Turn a parsed list item into a clean HEB search term.
 *   "One head of kale, chard, or collards" -> "kale"
 *   "Chicken or Veg Broth"                 -> "Chicken Broth"
 *   "cloves garlic (minced)"               -> "garlic"
 */
export function buildSearchQuery(item: GroceryListItem): string {
  let name = firstChoice(item.name);
  name = stripLeadingQuantity(name);
  name = name.replace(/\([^)]*\)/g, " ").replace(/\s*,.*$/, " ");
  return name.replace(/\s+/g, " ").trim() || item.name;
}

/**
 * Reduce "A, B, or C" / "A or B" to a single product. If the first choice is a
 * bare word and the last ends in a noun it lacks, borrow that noun
 * ("Chicken or Veg Broth" -> "Chicken Broth").
 */
function firstChoice(text: string): string {
  const parts = text
    .split(/\s*,\s*|\s+or\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return text.trim();
  }

  const first = parts[0];
  const lastWords = parts[parts.length - 1].split(/\s+/);
  const trailingNoun = lastWords[lastWords.length - 1];

  if (
    lastWords.length > 1 &&
    !first.includes(" ") &&
    !first.toLowerCase().includes(trailingNoun.toLowerCase())
  ) {
    return `${first} ${trailingNoun}`;
  }
  return first;
}

/** Strip leading count and container words ("one head of kale" -> "kale"). */
function stripLeadingQuantity(text: string): string {
  const stripped = text
    .trim()
    .replace(LEADING_NUMBER_WORD, "")
    .replace(LEADING_MEASURE, "")
    .replace(/^of\s+/i, "")
    .trim();
  return stripped || text.trim();
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Fraction of query tokens found in the product name, 0 to 1. Prefix matches count half. */
export function scoreMatch(query: string, productName: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return 0;
  }

  const nameTokens = tokenize(productName);
  const nameSet = new Set(nameTokens);

  let matched = 0;
  for (const qt of queryTokens) {
    if (nameSet.has(qt)) {
      matched += 1;
    } else if (nameTokens.some((nt) => nt.startsWith(qt) || qt.startsWith(nt))) {
      matched += 0.5;
    }
  }
  return matched / queryTokens.length;
}

/**
 * Index of the product name that best matches the query. Ties keep the
 * earliest result, since HEB already orders results by relevance; with no
 * overlap at all this falls back to the first result.
 */
export function pickBestMatch(query: string, productNames: string[]): number {
  let bestIndex = 0;
  let bestScore = 0;
  productNames.forEach((name, i) => {
    const score = scoreMatch(query, name);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  });
  return bestIndex;
}

export function buildSearchUrl(query: string, hebBrandOnly: boolean): string {
  const url = `https://www.heb.com/search/?q=${encodeURIComponent(query)}`;
  return hebBrandOnly ? `${url}&filter=${encodeURIComponent("brand:H-E-B")}` : url;
}
