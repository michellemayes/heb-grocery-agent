import type {
  GroceryListItem,
  ItemProgressState,
  ExtensionMessage,
  ShoppingState,
} from "./types";

// Product card selectors for HEB.com
const PRODUCT_CARD_SELECTORS = [
  "[data-qa='product-card']",
  "[data-automation-id='product-card']",
  "[data-test='product-card']",
  ".product-grid__item",
  ".product-item",
  ".product-card",
];

class HEBShoppingAgent {
  private isRunning = false;
  private currentAbortController: AbortController | null = null;

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        if (message.type === "START_SHOPPING") {
          this.handleStartShopping(message.shoppingList);
          sendResponse({ success: true });
        } else if (message.type === "CANCEL_SHOPPING") {
          this.handleCancelShopping();
          sendResponse({ success: true });
        }
        return true;
      }
    );
  }

  private async handleStartShopping(shoppingListText: string) {
    if (this.isRunning) {
      this.log("error", "Shopping run already in progress");
      return;
    }

    this.isRunning = true;
    this.currentAbortController = new AbortController();

    try {
      // Import and parse the list
      const { parseShoppingList } = await import("./listParser");
      const items = parseShoppingList(shoppingListText);

      this.log("info", `Parsed ${items.length} items from the list`);

      // Process each item
      for (let i = 0; i < items.length; i++) {
        if (this.currentAbortController.signal.aborted) {
          this.log("warn", "Shopping run cancelled");
          break;
        }

        const item = items[i];
        try {
          await this.processItem(item, i);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          this.updateItemState(i, "error", undefined, message);
          this.log("error", `Failed to process "${item.name}": ${message}`);
        }

        // Small delay between items
        await this.sleep(1500);
      }

      if (!this.currentAbortController.signal.aborted) {
        this.log("info", "Shopping run completed successfully");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.log("error", `Shopping run failed: ${message}`);
    } finally {
      this.isRunning = false;
      this.currentAbortController = null;
    }
  }

  private handleCancelShopping() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.log("warn", "Cancellation requested");
    }
  }

  private async processItem(item: GroceryListItem, index: number) {
    // Update state to searching
    this.updateItemState(index, "searching", `Searching for "${item.name}"`);
    this.log("info", `Searching for "${item.name}"`);

    // Navigate to search page
    const query = encodeURIComponent(item.name);
    const searchUrl = `https://www.heb.com/search/?q=${query}`;
    window.location.href = searchUrl;

    // Wait for page to load
    await this.waitForPageLoad();

    // Wait for product grid
    this.updateItemState(index, "evaluating", "Looking for products");
    await this.waitForProductGrid();

    // Find first product
    const productCard = await this.findFirstProductCard();
    if (!productCard) {
      throw new Error("No products found");
    }

    // Get product name
    const productName = this.getProductName(productCard) || item.name;
    this.log("info", `Found product: "${productName}"`);

    // Find and click add button
    this.updateItemState(
      index,
      "adding-to-cart",
      `Adding "${productName}" to cart`
    );

    const addButton = this.findAddButton(productCard);
    if (!addButton) {
      throw new Error("Could not find add-to-cart button");
    }

    addButton.click();
    this.log("info", `Clicked add-to-cart for "${productName}"`);

    // Wait a moment for the action to complete
    await this.sleep(1000);

    // Mark as completed
    this.updateItemState(index, "completed", `Added "${productName}" to cart`);
  }

  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", () => resolve(), { once: true });
      }
    });
  }

  private async waitForProductGrid(): Promise<void> {
    const maxAttempts = 40; // 8 seconds total
    const delay = 200;

    for (let i = 0; i < maxAttempts; i++) {
      for (const selector of PRODUCT_CARD_SELECTORS) {
        const element = document.querySelector(selector);
        if (element) {
          return;
        }
      }
      await this.sleep(delay);
    }

    throw new Error("Could not locate product results on the page");
  }

  private findFirstProductCard(): HTMLElement | null {
    for (const selector of PRODUCT_CARD_SELECTORS) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        return element;
      }
    }
    return null;
  }

  private getProductName(productCard: HTMLElement): string | null {
    const selectors = ["a", "h2", "h3", "span", "p"];
    for (const selector of selectors) {
      const element = productCard.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    return null;
  }

  private findAddButton(productCard: HTMLElement): HTMLButtonElement | null {
    const buttons = productCard.querySelectorAll("button");
    for (const button of buttons) {
      if (/add/i.test(button.textContent || "")) {
        return button;
      }
    }
    return null;
  }

  private updateItemState(
    index: number,
    state: ItemProgressState,
    detail?: string,
    error?: string
  ) {
    chrome.runtime.sendMessage({
      type: "ITEM_UPDATE",
      itemIndex: index,
      state,
      detail,
      error,
    });
  }

  private log(level: "info" | "warn" | "error", message: string) {
    console.log(`[HEB Agent] ${level.toUpperCase()}: ${message}`);
    chrome.runtime.sendMessage({
      type: "LOG",
      level,
      message,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Initialize the agent
new HEBShoppingAgent();

// Export for debugging
(window as any).__HEB_AGENT__ = HEBShoppingAgent;

