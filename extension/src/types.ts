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
  currentItemIndex: number;
  items: ItemState[];
  logs: LogEntry[];
}

export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: number;
}

export interface StartShoppingMessage {
  type: "START_SHOPPING";
  shoppingList: string;
}

export interface CancelShoppingMessage {
  type: "CANCEL_SHOPPING";
}

export interface StateUpdateMessage {
  type: "STATE_UPDATE";
  state: ShoppingState;
}

export interface ItemUpdateMessage {
  type: "ITEM_UPDATE";
  itemIndex: number;
  state: ItemProgressState;
  detail?: string;
  error?: string;
}

export interface LogMessage {
  type: "LOG";
  level: "info" | "warn" | "error";
  message: string;
}

export type ExtensionMessage =
  | StartShoppingMessage
  | CancelShoppingMessage
  | StateUpdateMessage
  | ItemUpdateMessage
  | LogMessage;

