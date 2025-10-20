export interface GroceryListItem {
  raw: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface ShoppingRunRequest {
  shoppingList: string;
}

export type RunLifecycleStatus = "idle" | "starting" | "in-progress" | "completed" | "error";

export type ItemProgressState =
  | "pending"
  | "parsing"
  | "searching"
  | "evaluating"
  | "adding-to-cart"
  | "completed"
  | "error";

export interface RunStatusEvent {
  type: "run-status";
  status: RunLifecycleStatus;
  message?: string;
}

export interface PlanEvent {
  type: "plan";
  items: GroceryListItem[];
}

export interface ItemStatusEvent {
  type: "item-status";
  item: GroceryListItem;
  state: ItemProgressState;
  detail?: string;
}

export interface ItemErrorEvent {
  type: "item-error";
  item: GroceryListItem;
  error: string;
}

export interface LogEvent {
  type: "log";
  level: "info" | "warn" | "error";
  message: string;
}

export type ShoppingRunEvent = RunStatusEvent | PlanEvent | ItemStatusEvent | ItemErrorEvent | LogEvent;
