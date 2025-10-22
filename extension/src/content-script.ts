import type {
  GroceryListItem,
  ItemProgressState,
  ExtensionMessage,
  ShoppingState,
} from "./types";

// Product card selectors for HEB.com
const PRODUCT_CARD_SELECTORS = [
  "[data-qe-id='productCard']",
  "[data-component='product-card']",
  "[data-testid='productCard']",
  "[data-qa='product-card']",
  "[data-automation-id='product-card']",
  "[data-test='product-card']",
  ".product-grid__item",
  ".product-item",
  ".product-card",
];

interface ContentScriptState {
  isRunning: boolean;
  shoppingListText: string;
  items: GroceryListItem[];
  currentItemIndex: number;
  currentStep: "searching" | "processing" | "done";
  hebBrandOnly: boolean;
}

class HEBShoppingAgent {
  private state: ContentScriptState | null = null;

  constructor() {
    this.setupMessageListener();
    // Check if we need to resume after a page load
    this.checkAndResume();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        if (message.type === "START_SHOPPING") {
          this.handleStartShopping(message.shoppingList, message.hebBrandOnly);
          sendResponse({ success: true });
        } else if (message.type === "CANCEL_SHOPPING") {
          this.handleCancelShopping();
          sendResponse({ success: true });
        }
        return true;
      }
    );
  }

  private async checkAndResume() {
    // Check if there's a shopping run to resume
    const result = await chrome.storage.local.get("contentScriptState");
    if (result.contentScriptState) {
      this.state = result.contentScriptState;
      
      if (this.state.currentStep === "processing") {
        // Wait for DOM to be ready
        if (document.readyState === "loading") {
          await new Promise<void>((resolve) => {
            document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
          });
        }
        
        // Additional delay to ensure page is rendered
        await this.sleep(800);
        
        // We're on the search results page, process the item
        await this.processCurrentItem();
      }
    }
  }

  private async handleStartShopping(shoppingListText: string, hebBrandOnly = false) {
    if (this.state?.isRunning) {
      this.log("error", "Shopping run already in progress");
      return;
    }

    try {
      // Import and parse the list
      const { parseShoppingList } = await import("./listParser");
      const items = parseShoppingList(shoppingListText);

      // Initialize state
      this.state = {
        isRunning: true,
        shoppingListText,
        items,
        currentItemIndex: 0,
        currentStep: "searching",
        hebBrandOnly,
      };

      // Save state
      await this.saveState();

      // Start processing first item
      await this.navigateToSearch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.log("error", `Shopping run failed: ${message}`);
      await this.clearState();
    }
  }

  private async handleCancelShopping() {
    this.log("warn", "Cancellation requested");
    await this.clearState();
  }

  private async saveState() {
    if (this.state) {
      await chrome.storage.local.set({ contentScriptState: this.state });
    }
  }

  private async clearState() {
    this.state = null;
    await chrome.storage.local.remove("contentScriptState");
  }

  private async navigateToSearch() {
    if (!this.state || this.state.currentItemIndex >= this.state.items.length) {
      this.log("info", "Shopping run completed successfully");
      await this.clearState();
      return;
    }

    const item = this.state.items[this.state.currentItemIndex];
    this.updateItemState(this.state.currentItemIndex, "searching", `Searching for "${item.name}"`);

    // Update state to processing before navigation
    this.state.currentStep = "processing";
    await this.saveState();

    // Navigate to search page
    const query = encodeURIComponent(item.name);
    let searchUrl = `https://www.heb.com/search/?q=${query}`;
    
    // Add HEB brand filter if enabled
    if (this.state.hebBrandOnly) {
      searchUrl += `&filter=brand%3AH-E-B`;
    }
    
    window.location.href = searchUrl;
  }

  private async processCurrentItem() {
    if (!this.state) return;

    const index = this.state.currentItemIndex;
    const item = this.state.items[index];

    try {
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

      // Use a more realistic click simulation
      await this.clickElement(addButton);

      // Wait a moment for the action to complete
      await this.sleep(800);

      // Mark as completed
      this.updateItemState(index, "completed", `Added "${productName}" to cart`);

      // Move to next item
      this.state.currentItemIndex++;
      this.state.currentStep = "searching";
      await this.saveState();

      // Small delay before next item
      await this.sleep(500);

      // Process next item
      await this.navigateToSearch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.updateItemState(index, "error", undefined, message);
      this.log("error", `Failed to process "${item.name}": ${message}`);

      // Move to next item even after error
      this.state.currentItemIndex++;
      this.state.currentStep = "searching";
      await this.saveState();

      await this.sleep(500);
      await this.navigateToSearch();
    }
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
    // First, wait for page to be interactive
    if (document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          window.addEventListener("load", () => resolve(), { once: true });
        }
      });
    }

    // Give the page a moment to render after load
    await this.sleep(600);

    const maxAttempts = 60; // 12 seconds total
    const delay = 200;

    for (let i = 0; i < maxAttempts; i++) {
      for (const selector of PRODUCT_CARD_SELECTORS) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
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
    // First, try HEB's specific data attribute
    let button = productCard.querySelector<HTMLButtonElement>(
      'button[data-qe-id="addToCart"]'
    );
    if (button) {
      return button;
    }

    // Try other common selectors
    const selectors = [
      'button[data-qe-id*="add"]',
      'button[aria-label*="Add"]',
      'button[class*="addToCart"]',
      'button[class*="AddToCart"]',
    ];

    for (const selector of selectors) {
      button = productCard.querySelector<HTMLButtonElement>(selector);
      if (button) {
        return button;
      }
    }

    // Fallback: search by text content
    const buttons = productCard.querySelectorAll("button");
    
    for (const btn of buttons) {
      const text = btn.textContent || "";
      if (/add.*cart/i.test(text)) {
        return btn as HTMLButtonElement;
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

  private async clickElement(element: HTMLElement): Promise<void> {
    // Scroll element into view
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    await this.sleep(150);

    // Get element position for realistic coordinates
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Create realistic mouse events
    const mouseEventInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
    };

    // Dispatch multiple events to simulate real user interaction
    element.dispatchEvent(new MouseEvent("mouseover", mouseEventInit));
    await this.sleep(50);

    element.dispatchEvent(new MouseEvent("mousedown", mouseEventInit));
    await this.sleep(50);

    element.dispatchEvent(new MouseEvent("mouseup", mouseEventInit));
    await this.sleep(50);

    element.dispatchEvent(new MouseEvent("click", mouseEventInit));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Initialize the agent
new HEBShoppingAgent();

// Export for debugging
(window as any).__HEB_AGENT__ = HEBShoppingAgent;

