import { EventEmitter } from "node:events";

import type { GroceryListItem, ShoppingRunEvent } from "heb-grocery-shared";

import { HebAutomation } from "./hebAutomation.js";
import { parseShoppingList } from "./listParser.js";

export interface ShoppingRunOptions {
  rawList: string;
  automation: HebAutomation;
  emit: (event: ShoppingRunEvent) => void;
  signal?: AbortSignal;
}

export class ShoppingRun extends EventEmitter {
  private readonly automation: HebAutomation;
  private readonly emitEvent: (event: ShoppingRunEvent) => void;
  private readonly signal?: AbortSignal;
  private readonly items: GroceryListItem[];

  constructor(options: ShoppingRunOptions) {
    super();
    this.automation = options.automation;
    this.emitEvent = options.emit;
    this.signal = options.signal;
    this.items = parseShoppingList(options.rawList);
  }

  async execute(): Promise<void> {
    this.dispatch({ type: "run-status", status: "starting" });
    if (!this.items.length) {
      this.dispatch({
        type: "run-status",
        status: "error",
        message: "No shoppable items were identified in the provided list.",
      });
      return;
    }

    this.dispatch({ type: "plan", items: this.items });

    try {
      await this.automation.init();
      this.dispatch({
        type: "log",
        level: "info",
        message:
          "Browser launched. Ensure you are signed into HEB and have a store selected.",
      });

      this.dispatch({ type: "run-status", status: "in-progress" });

      for (const item of this.items) {
        this.signal?.throwIfAborted?.();
        this.dispatch({
          type: "item-status",
          item,
          state: "searching",
          detail: `Looking up "${item.name}"`,
        });

        await this.processItem(item);

        this.dispatch({
          type: "item-status",
          item,
          state: "completed",
          detail: `Added "${item.name}" to the cart.`,
        });
      }

      this.dispatch({
        type: "run-status",
        status: "completed",
        message: "Shopping run completed.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      if (this.signal?.aborted) {
        this.dispatch({
          type: "run-status",
          status: "error",
          message: "Shopping run was cancelled.",
        });
      } else {
        this.dispatch({ type: "run-status", status: "error", message });
        this.dispatch({
          type: "log",
          level: "error",
          message,
        });
      }
      throw error;
    }
  }

  private async processItem(item: GroceryListItem): Promise<void> {
    this.dispatch({
      type: "item-status",
      item,
      state: "evaluating",
      detail: "Selecting the best matching product.",
    });

    await this.automation.addItemToCart(
      item,
      (event) => this.dispatch(event),
      this.signal,
    );
  }

  private dispatch(event: ShoppingRunEvent): void {
    this.emitEvent(event);
    super.emit("event", event);
  }
}

export async function runShoppingList(options: ShoppingRunOptions): Promise<void> {
  const run = new ShoppingRun(options);
  await run.execute();
}
