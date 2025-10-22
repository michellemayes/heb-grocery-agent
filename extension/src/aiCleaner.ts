import type { AIProvider, CleanupChange, CleanupDiff } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const CLEANUP_PROMPT = `You are a grocery list assistant. Clean up the following grocery list by:
1. Fixing typos and spelling mistakes
2. Standardizing item names (e.g., "Roma Tomatoes" → "tomatoes")
3. Removing duplicate items
4. Keeping quantities, units, and notes intact
5. Preserving section headers like [Produce], [Dairy], etc. Or reformat it to [Category] format.
6. Removing item qualifiers like "large", "small", "extra large", etc. unless it is a description of eggs.
7. You can keep qualifiers like "frozen" or "organic".

If a list item has OR in it, pick the more popular/common item. Examples: "Large Eggs OR Medium Eggs" → "Large Eggs". "Chicken or Veg Broth" → "Chicken Broth".

Return ONLY the cleaned list, one item per line, with the exact same format as the input. Convert section headers if needed.
Do not add explanations, comments, or markdown formatting.

The items in the grocery list should be cleaned so that the first item in a grocery store's online store is highly likely to be the item the user intended to buy.

Original list:`;

/**
 * Clean a shopping list using AI (OpenAI or Anthropic)
 */
export async function cleanShoppingListWithAI(
  listText: string,
  provider: AIProvider,
  apiKey: string
): Promise<CleanupDiff> {
  if (provider === "none" || !apiKey) {
    throw new Error("AI provider or API key not configured");
  }

  try {
    let cleanedText: string;

    if (provider === "openai") {
      cleanedText = await cleanWithOpenAI(listText, apiKey);
    } else if (provider === "anthropic") {
      cleanedText = await cleanWithAnthropic(listText, apiKey);
    } else if (provider === "groq") {
      cleanedText = await cleanWithGroq(listText, apiKey);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Generate diff
    const originalLines = listText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const cleanedLines = cleanedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const changes = generateChanges(originalLines, cleanedLines);

    return {
      original: originalLines,
      cleaned: cleanedLines,
      changes,
      method: "ai",
    };
  } catch (error) {
    throw new Error(`AI cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Clean list using OpenAI API
 */
async function cleanWithOpenAI(listText: string, apiKey: string): Promise<string> {
  // Try gpt-4o-mini first, fall back to gpt-3.5-turbo if needed
  const models = ["gpt-4o-mini", "gpt-3.5-turbo"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a helpful grocery list assistant. Clean up grocery lists by fixing typos, standardizing names, and removing duplicates. Return only the cleaned list with no extra formatting or explanations.",
            },
            {
              role: "user",
              content: `${CLEANUP_PROMPT}\n\n${listText}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // If model not found, try next model
        if (response.status === 404 || errorMsg.includes("model") || errorMsg.includes("does not exist")) {
          lastError = new Error(`Model ${model} not available: ${errorMsg}`);
          continue;
        }
        
        // For other errors (auth, rate limit, etc), throw immediately
        throw new Error(`OpenAI API error: ${errorMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      return content.trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // If it's not a model availability issue, throw immediately
      if (!lastError.message.includes("not available") && !lastError.message.includes("does not exist")) {
        throw lastError;
      }
    }
  }

  // If we get here, all models failed
  throw lastError || new Error("All OpenAI models failed");
}

/**
 * Clean list using Groq API
 */
async function cleanWithGroq(listText: string, apiKey: string): Promise<string> {
  // Use fast open-source models available on Groq
  const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a helpful grocery list assistant. Clean up grocery lists by fixing typos, standardizing names, and removing duplicates. Return only the cleaned list with no extra formatting or explanations.",
            },
            {
              role: "user",
              content: `${CLEANUP_PROMPT}\n\n${listText}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // If model not found, try next model
        if (response.status === 404 || errorMsg.includes("model") || errorMsg.includes("does not exist")) {
          lastError = new Error(`Model ${model} not available: ${errorMsg}`);
          continue;
        }
        
        // For other errors (auth, rate limit, etc), throw immediately
        throw new Error(`Groq API error: ${errorMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response content from Groq");
      }

      return content.trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // If it's not a model availability issue, throw immediately
      if (!lastError.message.includes("not available") && !lastError.message.includes("does not exist")) {
        throw lastError;
      }
    }
  }

  // If we get here, all models failed
  throw lastError || new Error("All Groq models failed");
}

/**
 * Clean list using Anthropic API
 */
async function cleanWithAnthropic(listText: string, apiKey: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `${CLEANUP_PROMPT}\n\n${listText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No response from Anthropic");
  }

  return content.trim();
}

/**
 * Generate a list of changes between original and cleaned lists
 */
function generateChanges(original: string[], cleaned: string[]): CleanupChange[] {
  const changes: CleanupChange[] = [];

  // Track which cleaned lines we've matched
  const matchedCleaned = new Set<number>();

  for (const origLine of original) {
    // Skip empty lines and section headers
    if (!origLine.trim() || /^\s*\[.*\]\s*$/.test(origLine)) {
      changes.push({
        type: "unchanged",
        original: origLine,
        cleaned: origLine,
      });
      continue;
    }

    // Try to find exact match (case-insensitive)
    const cleanedIndex = cleaned.findIndex(
      (line, idx) => !matchedCleaned.has(idx) && line.toLowerCase() === origLine.toLowerCase()
    );

    if (cleanedIndex !== -1) {
      matchedCleaned.add(cleanedIndex);
      changes.push({
        type: "unchanged",
        original: origLine,
        cleaned: cleaned[cleanedIndex],
      });
      continue;
    }

    // Try to find similar match (fuzzy) - higher threshold for better matching
    const similarIndex = cleaned.findIndex((line, idx) => {
      if (matchedCleaned.has(idx)) return false;
      const similarity = calculateSimilarity(origLine.toLowerCase(), line.toLowerCase());
      return similarity > 0.5;
    });

    if (similarIndex !== -1) {
      matchedCleaned.add(similarIndex);
      const similarity = calculateSimilarity(origLine.toLowerCase(), cleaned[similarIndex].toLowerCase());
      
      // Determine if it's a typo fix or standardization
      const changeType = similarity > 0.8 ? "fixed" : "standardized";
      
      changes.push({
        type: changeType,
        original: origLine,
        cleaned: cleaned[similarIndex],
        reason: changeType === "fixed" ? "Fixed by AI" : "Standardized by AI",
      });
      continue;
    }

    // Try to find a match by checking if cleaned item contains key words from original
    // This helps with standardization like "Roma Tomatoes" → "tomatoes"
    const origWords = origLine.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const keywordMatch = cleaned.findIndex((line, idx) => {
      if (matchedCleaned.has(idx)) return false;
      const cleanedWords = line.toLowerCase().split(/\s+/);
      return origWords.some(word => cleanedWords.includes(word));
    });

    if (keywordMatch !== -1) {
      matchedCleaned.add(keywordMatch);
      changes.push({
        type: "standardized",
        original: origLine,
        cleaned: cleaned[keywordMatch],
        reason: "Standardized by AI",
      });
      continue;
    }

    // Line was removed (likely a duplicate or error)
    changes.push({
      type: "removed",
      original: origLine,
      cleaned: "",
      reason: "Removed by AI (duplicate or invalid)",
    });
  }

  return changes;
}

/**
 * Calculate simple string similarity (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Validate an API key by making a test request
 * Note: For OpenAI, we skip validation since project keys may have different permissions
 */
export async function validateApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  if (provider === "none" || !apiKey) {
    return false;
  }

  try {
    if (provider === "openai") {
      // OpenAI project keys don't always have access to /v1/models endpoint
      // We'll skip validation and let the actual API call handle any auth errors
      // Just check that the key has the expected format
      return apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-");
    } else if (provider === "groq") {
      // Groq keys start with gsk_
      // Just validate the format, actual validation happens on use
      return apiKey.startsWith("gsk_");
    } else if (provider === "anthropic") {
      // Anthropic doesn't have a simple validation endpoint, so we make a minimal request
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      return response.ok;
    }
  } catch (error) {
    console.error("API key validation error:", error);
    return false;
  }

  return false;
}

