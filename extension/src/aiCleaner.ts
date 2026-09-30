import { calculateSimilarity } from "./similarity";
import type { AIProvider, CleanupChange, CleanupDiff } from "./types";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 4000;

export interface AIModelOption {
  id: string;
  label: string;
  /** Provider-specific request fields sent alongside the model id. */
  params: Record<string, unknown>;
  /** Anthropic only: extra beta headers the params need. */
  betas?: string[];
}

/**
 * Models offered per provider, cheapest first. The first entry is the
 * default, since cleaning a grocery list is a simple task.
 */
export const AI_MODELS: Record<Exclude<AIProvider, "none">, AIModelOption[]> = {
  groq: [
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest, cheapest)", params: { temperature: 0.2 } },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", params: { temperature: 0.2 } },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", params: { temperature: 0.2 } },
  ],
  openai: [
    { id: "gpt-5-nano", label: "GPT-5 nano (cheapest)", params: { reasoning_effort: "minimal" } },
    { id: "gpt-5-mini", label: "GPT-5 mini", params: { reasoning_effort: "minimal" } },
  ],
  anthropic: [
    // Haiku 4.5 does not accept the effort or fallbacks parameters.
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (cheapest, $1/$5 per M tokens)", params: {} },
    {
      id: "claude-sonnet-5-5",
      label: "Claude Sonnet 5.5 ($2/$10 per M tokens)",
      params: { output_config: { effort: "low" }, fallbacks: "default" },
      betas: ["server-side-fallback-2026-07-01"],
    },
    {
      id: "claude-opus-5-5",
      label: "Claude Opus 5.5 ($4/$20 per M tokens)",
      params: { output_config: { effort: "low" }, fallbacks: "default" },
      betas: ["server-side-fallback-2026-07-01"],
    },
  ],
};

/** The configured model for a provider, falling back to its cheapest option. */
export function resolveModel(provider: Exclude<AIProvider, "none">, modelId?: string): AIModelOption {
  const options = AI_MODELS[provider];
  return options.find((option) => option.id === modelId) ?? options[0];
}

const CLEANUP_PROMPT = `Clean up this grocery list so that the first search result on a grocery store's website is very likely the item the shopper meant.

- Fix typos and spelling.
- Standardize item names (e.g. "Roma Tomatoes" -> "tomatoes").
- Remove duplicate items.
- Keep quantities, units, and notes in parentheses.
- Keep section headers in [Category] form, converting other header styles to it.
- Drop size qualifiers like "large" or "small", except for eggs. Keep qualifiers like "frozen" or "organic".
- When an item offers a choice, keep the most common one ("Chicken or Veg Broth" -> "Chicken Broth").

Reply with only the cleaned list, one item per line, in the same format as the input. No commentary or markdown.

List:`;

/** Clean a shopping list with the configured AI provider. */
export async function cleanShoppingListWithAI(
  listText: string,
  provider: AIProvider,
  apiKey: string,
  modelId?: string,
): Promise<CleanupDiff> {
  if (provider === "none") {
    throw new Error("No AI provider configured");
  }
  const model = resolveModel(provider, modelId);
  const prompt = `${CLEANUP_PROMPT}\n\n${listText}`;

  let cleanedText: string;
  switch (provider) {
    case "openai":
      cleanedText = await completeOpenAICompatible(
        "OpenAI",
        "https://api.openai.com/v1/chat/completions",
        apiKey,
        { model: model.id, ...model.params },
        prompt,
      );
      break;
    case "groq":
      cleanedText = await completeOpenAICompatible(
        "Groq",
        "https://api.groq.com/openai/v1/chat/completions",
        apiKey,
        { model: model.id, ...model.params },
        prompt,
      );
      break;
    case "anthropic":
      cleanedText = await completeAnthropic(apiKey, model, prompt);
      break;
    default:
      throw new Error("No AI provider configured");
  }

  const original = toLines(listText);
  const cleaned = toLines(stripCodeFence(cleanedText));
  if (cleaned.length === 0) {
    throw new Error("The AI returned an empty list");
  }

  return { original, cleaned, changes: diffLines(original, cleaned), method: "ai" };
}

async function completeOpenAICompatible(
  label: string,
  url: string,
  apiKey: string,
  modelParams: Record<string, unknown>,
  prompt: string,
): Promise<string> {
  const data = await postJson(label, url, { Authorization: `Bearer ${apiKey}` }, {
    ...modelParams,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`${label} returned no content`);
  }
  return content;
}

async function completeAnthropic(
  apiKey: string,
  model: AIModelOption,
  prompt: string,
): Promise<string> {
  const data = await postJson(
    "Anthropic",
    "https://api.anthropic.com/v1/messages",
    {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      ...(model.betas?.length ? { "anthropic-beta": model.betas.join(",") } : {}),
      // Required for requests sent straight from the browser; without it the
      // request is blocked by CORS and never reaches the API.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    {
      model: model.id,
      max_tokens: MAX_OUTPUT_TOKENS,
      ...model.params,
      messages: [{ role: "user", content: prompt }],
    },
  );

  if (data.stop_reason === "refusal") {
    throw new Error("Anthropic declined the request");
  }
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("");
  if (!text) {
    throw new Error("Anthropic returned no content");
  }
  return text;
}

// Response bodies differ per provider and are only read defensively above.
async function postJson(
  label: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(`${label} did not respond within ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw new Error(`Could not reach ${label}. Check your connection.`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.error?.message ?? response.statusText;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${label} rejected the API key (${detail})`);
    }
    if (response.status === 429) {
      throw new Error(`${label} rate limit reached. Wait a moment and try again.`);
    }
    throw new Error(`${label} error ${response.status}: ${detail}`);
  }
  return response.json();
}

function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Models sometimes wrap the list in a ``` fence despite being told not to. */
function stripCodeFence(text: string): string {
  return text.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n\s*```\s*$/, "");
}

const isHeader = (line: string) => /^\[.*\]$/.test(line);

/**
 * Pair each original line with a line of the AI output to describe what
 * changed. The AI returns a whole new list, so this is a best-effort match:
 * exact, then close spelling, then shared keywords.
 */
export function diffLines(original: string[], cleaned: string[]): CleanupChange[] {
  const used = new Set<number>();
  const claim = (predicate: (line: string) => boolean): number => {
    const index = cleaned.findIndex((line, i) => !used.has(i) && predicate(line));
    if (index !== -1) {
      used.add(index);
    }
    return index;
  };

  return original.map((line): CleanupChange => {
    const lower = line.toLowerCase();

    if (isHeader(line)) {
      claim((c) => c.toLowerCase() === lower);
      return { type: "unchanged", original: line, cleaned: line };
    }

    const exact = claim((c) => c.toLowerCase() === lower);
    if (exact !== -1) {
      return { type: "unchanged", original: line, cleaned: cleaned[exact] };
    }

    const similar = claim((c) => calculateSimilarity(lower, c.toLowerCase()) > 0.5);
    if (similar !== -1) {
      const fixed = calculateSimilarity(lower, cleaned[similar].toLowerCase()) > 0.8;
      return {
        type: fixed ? "fixed" : "standardized",
        original: line,
        cleaned: cleaned[similar],
        reason: fixed ? "Spelling fixed" : "Name standardized",
      };
    }

    const keywords = lower.split(/\s+/).filter((w) => w.length > 3);
    const related = claim((c) => {
      const words = c.toLowerCase().split(/\s+/);
      return keywords.some((w) => words.includes(w));
    });
    if (related !== -1) {
      return {
        type: "standardized",
        original: line,
        cleaned: cleaned[related],
        reason: "Name standardized",
      };
    }

    return { type: "removed", original: line, cleaned: "", reason: "Duplicate or not an item" };
  });
}
