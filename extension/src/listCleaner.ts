import { findBestMatch } from "string-similarity";
import { GROCERY_DATABASE, normalizeGroceryName } from "./groceryDatabase";
import type { CleanupChange, CleanupDiff } from "./types";

const SIMILARITY_THRESHOLD = 0.7;

/**
 * Clean up a shopping list by fixing typos, standardizing names, and removing duplicates
 * Uses string similarity matching against a known grocery database
 */
export function cleanShoppingList(listText: string): CleanupDiff {
  const lines = listText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  
  const changes: CleanupChange[] = [];
  const cleanedLines: string[] = [];
  const seenItems = new Set<string>();

  for (const line of lines) {
    // Skip category headers
    if (/^\s*\[.*\]\s*$/.test(line)) {
      cleanedLines.push(line);
      changes.push({
        type: "unchanged",
        original: line,
        cleaned: line,
      });
      continue;
    }

    // Skip generic section headers
    const lowerLine = line.toLowerCase();
    if (
      lowerLine === "groceries" ||
      lowerLine === "grocery list" ||
      lowerLine === "shopping list"
    ) {
      cleanedLines.push(line);
      changes.push({
        type: "unchanged",
        original: line,
        cleaned: line,
      });
      continue;
    }

    // Extract the item name (remove bullets, numbers, quantities, etc.)
    const itemName = extractItemName(line);
    if (!itemName) {
      continue;
    }

    // Normalize for matching
    const normalized = normalizeGroceryName(itemName);

    // Check for duplicates
    if (seenItems.has(normalized)) {
      changes.push({
        type: "removed",
        original: line,
        cleaned: "",
        reason: "Duplicate item",
      });
      continue;
    }

    seenItems.add(normalized);

    // Find best match in database
    const bestMatch = findBestMatch(normalized, GROCERY_DATABASE);
    const { target: matchedItem, rating } = bestMatch.bestMatch;

    if (rating >= SIMILARITY_THRESHOLD && matchedItem !== normalized) {
      // Found a better match - fix typo or standardize
      const cleanedLine = replaceItemName(line, itemName, matchedItem);
      cleanedLines.push(cleanedLine);
      changes.push({
        type: rating > 0.9 ? "standardized" : "fixed",
        original: line,
        cleaned: cleanedLine,
        reason: rating > 0.9 ? "Standardized name" : `Fixed typo (${Math.round(rating * 100)}% match)`,
      });
    } else {
      // No changes needed
      cleanedLines.push(line);
      changes.push({
        type: "unchanged",
        original: line,
        cleaned: line,
      });
    }
  }

  return {
    original: lines,
    cleaned: cleanedLines,
    changes,
    method: "string-similarity",
  };
}

/**
 * Extract the item name from a line (removing bullets, quantities, etc.)
 */
function extractItemName(line: string): string {
  // Remove leading bullets and numbers
  let cleaned = line.replace(/^\s*(?:[-*•+]\s+|\d+[.)]\s+)/, "").trim();

  // Try to extract quantity pattern (e.g., "2 cups Milk" -> "Milk")
  const quantityPattern = /^(?:\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?\s*(?:cup|cups|tsp|teaspoon|tbsp|tablespoon|oz|ounce|lb|lbs|pound|g|gram|kg|kilogram|bag|bags|ct|count|can|cans|pkg|package|bottle|bottles|x)?\s+(?:of\s+)?)?(.+)$/i;
  const match = cleaned.match(quantityPattern);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // Remove notes in parentheses for matching purposes
  cleaned = cleaned.replace(/\([^)]*\)/, "").trim();

  return cleaned;
}

/**
 * Replace the item name in a line while preserving quantities, notes, etc.
 */
function replaceItemName(line: string, oldName: string, newName: string): string {
  // Find the position of the item name in the line
  const index = line.toLowerCase().indexOf(oldName.toLowerCase());
  if (index === -1) {
    return line;
  }

  // Preserve capitalization style
  const capitalizedNew = preserveCapitalization(oldName, newName);

  // Replace the item name
  return line.substring(0, index) + capitalizedNew + line.substring(index + oldName.length);
}

/**
 * Preserve the capitalization style of the original text
 */
function preserveCapitalization(original: string, replacement: string): string {
  // If original is all uppercase, make replacement uppercase
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  // If original starts with uppercase, capitalize replacement
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  // Otherwise, use replacement as-is (lowercase)
  return replacement;
}

/**
 * Apply a cleanup diff to get the cleaned list text
 */
export function applyCleanup(diff: CleanupDiff): string {
  return diff.cleaned.join("\n");
}

/**
 * Get a summary of changes made during cleanup
 */
export function getCleanupSummary(diff: CleanupDiff): {
  fixed: number;
  removed: number;
  standardized: number;
  unchanged: number;
  total: number;
} {
  const summary = {
    fixed: 0,
    removed: 0,
    standardized: 0,
    unchanged: 0,
    total: diff.changes.length,
  };

  for (const change of diff.changes) {
    summary[change.type]++;
  }

  return summary;
}

