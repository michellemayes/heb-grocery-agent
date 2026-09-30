/** Levenshtein-based similarity, 0 (nothing shared) to 1 (identical). */
export function calculateSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) {
    return 1;
  }
  return (longest - levenshteinDistance(a, b)) / longest;
}

function levenshteinDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Sørensen–Dice coefficient over character bigrams, ignoring whitespace.
 * Same scoring as the `string-similarity` package this replaces.
 */
export function diceCoefficient(first: string, second: string): number {
  const a = first.replace(/\s+/g, "");
  const b = second.replace(/\s+/g, "");
  if (a === b) {
    return 1;
  }
  if (a.length < 2 || b.length < 2) {
    return 0;
  }

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  let shared = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigrams.get(bigram) ?? 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      shared++;
    }
  }
  return (2 * shared) / (a.length + b.length - 2);
}

/** The candidate most similar to `target`, with its Dice score. */
export function findBestMatch(
  target: string,
  candidates: readonly string[],
): { match: string; rating: number } {
  let best = { match: "", rating: 0 };
  for (const candidate of candidates) {
    const rating = diceCoefficient(target, candidate);
    if (rating > best.rating) {
      best = { match: candidate, rating };
    }
  }
  return best;
}
