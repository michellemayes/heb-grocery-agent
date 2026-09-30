export interface GroceryListItem {
  raw: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export type ItemProgressState =
  | "pending"
  | "searching"
  | "evaluating"
  | "adding-to-cart"
  | "completed"
  | "error";

export interface ItemState {
  item: GroceryListItem;
  state: ItemProgressState;
  detail?: string;
  error?: string;
}

export interface ShoppingState {
  isRunning: boolean;
  /** Identifies the active run so a cancelled or superseded run stops itself. */
  runId?: string;
  currentItemIndex: number;
  items: ItemState[];
  logs: LogEntry[];
}

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
}

/** Side panel -> background */
export type PanelMessage =
  | { type: "START_SHOPPING"; shoppingList: string; hebBrandOnly: boolean }
  | { type: "CANCEL_SHOPPING" }
  | { type: "RESET_SHOPPING" }
  | { type: "CLEAR_LOGS" };

/** Background -> side panel */
export interface StateUpdateMessage {
  type: "STATE_UPDATE";
  state: ShoppingState;
}

/** Background -> content script: add one item from the current search page. */
export interface AddItemRequest {
  type: "ADD_ITEM";
  query: string;
}

export type AddItemResult =
  | { ok: true; productName: string }
  | { ok: false; error: string };

export type AIProvider = "none" | "openai" | "anthropic" | "groq";

export interface CleanupSettings {
  enabled: boolean;
  provider: AIProvider;
  apiKey: string;
  /** Model id for the provider; unset means the provider's cheapest model. */
  model?: string;
}

export type CleanupChangeType = "fixed" | "removed" | "standardized" | "unchanged";

export interface CleanupChange {
  type: CleanupChangeType;
  original: string;
  cleaned: string;
  reason?: string;
}

export interface CleanupDiff {
  original: string[];
  cleaned: string[];
  changes: CleanupChange[];
  method: "string-similarity" | "ai";
}
