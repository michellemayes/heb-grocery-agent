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
    // A new run always supersedes any previous (possibly stalled) run so the
    // agent can never get permanently stuck in a "running" state.
    await this.clearState();

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
    const searchTerm = this.buildSearchQuery(item);
    this.updateItemState(this.state.currentItemIndex, "searching", `Searching for "${searchTerm}"`);

    // Update state to processing before navigation
    this.state.currentStep = "processing";
    await this.saveState();

    // Navigate to search page
    const query = encodeURIComponent(searchTerm);
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

      // Pick the product that best matches the search term, rather than blindly
      // taking the first result (which could be e.g. sesame seeds for "sesame oil").
      const query = this.buildSearchQuery(item);
      const match = this.findBestProductCard(query);
      if (!match) {
        throw new Error("No products found");
      }

      const productCard = match.card;
      const productName = match.name || item.name;

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

  /**
   * Collect the first several product cards on the page (from whichever
   * selector matches first).
   */
  private collectProductCards(max = 12): HTMLElement[] {
    for (const selector of PRODUCT_CARD_SELECTORS) {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      if (elements.length > 0) {
        return Array.from(elements).slice(0, max);
      }
    }
    return [];
  }

  /**
   * Choose the product card whose name best matches the search query. Falls
   * back to the first card when nothing shares any words with the query.
   */
  private findBestProductCard(
    query: string
  ): { card: HTMLElement; name: string } | null {
    const cards = this.collectProductCards();
    if (cards.length === 0) {
      return null;
    }

    const queryTokens = this.tokenize(query);

    let best: { card: HTMLElement; name: string; score: number } | null = null;
    for (const card of cards) {
      const name = this.getProductName(card) || "";
      const score = this.scoreMatch(queryTokens, name);
      // Strictly-greater keeps the earliest card on ties (results are in
      // relevance order already).
      if (!best || score > best.score) {
        best = { card, name, score };
      }
    }

    if (!best || best.score === 0) {
      // No token overlap with any result — keep the original first-result behavior.
      const card = cards[0];
      return { card, name: this.getProductName(card) || "" };
    }

    return { card: best.card, name: best.name };
  }

  /**
   * Turn a raw grocery-list item into a clean HEB search term.
   * e.g. "One head of kale, chard, or collards" -> "kale"
   *      "Chicken or Veg Broth" -> "Chicken Broth"
   *      "2 cloves garlic (minced)" -> "garlic"
   */
  private buildSearchQuery(item: GroceryListItem): string {
    let name = item.name || "";

    // Reduce a list of alternatives to a single searchable product.
    name = this.firstChoice(name);

    // Drop leading count/measure words the parser may have left in.
    name = this.stripLeadingQuantity(name);

    // Remove parenthetical notes and any trailing prep after a comma.
    name = name.replace(/\([^)]*\)/g, " ");
    name = name.replace(/\s*,.*$/, " ");

    const cleaned = name.replace(/\s+/g, " ").trim();
    return cleaned || item.name;
  }

  /**
   * Reduce "A, B, or C" / "A or B" style choices to a single product,
   * borrowing a trailing noun when the alternatives share one implicitly
   * ("chicken or veg broth" -> "chicken broth").
   */
  private firstChoice(text: string): string {
    const parts = text
      .split(/\s*,\s*|\s+\bor\b\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      return text.trim();
    }

    let first = parts[0];
    const last = parts[parts.length - 1];
    const lastWords = last.split(/\s+/);
    const trailingNoun = lastWords[lastWords.length - 1] ?? "";

    // If the first choice is a bare word and the final choice ends in a noun
    // the first one lacks, borrow it ("Chicken or Veg Broth" -> "Chicken Broth").
    if (
      trailingNoun &&
      lastWords.length > 1 &&
      first.split(/\s+/).length === 1 &&
      !first.toLowerCase().includes(trailingNoun.toLowerCase())
    ) {
      first = `${first} ${trailingNoun}`;
    }

    return first;
  }

  /**
   * Strip leading count words and unit/container words that are not part of
   * the product name itself ("one head of kale" -> "kale").
   */
  private stripLeadingQuantity(text: string): string {
    const numberWords =
      "one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|few|dozen|half";
    const measures =
      "head|heads|bunch|bunches|clove|cloves|stalk|stalks|sprig|sprigs|" +
      "loaf|loaves|stick|sticks|slice|slices|piece|pieces|can|cans|bag|bags|" +
      "box|boxes|package|packages|pkg|bottle|bottles|jar|jars|container|containers|" +
      "cup|cups|tsp|teaspoon|teaspoons|tbsp|tablespoon|tablespoons|oz|ounce|ounces|" +
      "lb|lbs|pound|pounds|gram|grams|g|kg|pint|pints|quart|quarts|gallon|gallons";

    let t = text.trim();
    t = t.replace(new RegExp(`^\\s*(?:${numberWords})\\b\\s+`, "i"), "");
    t = t.replace(new RegExp(`^\\s*(?:${measures})\\b\\s+(?:of\\s+)?`, "i"), "");
    t = t.replace(/^\s*of\s+/i, "");
    return t.trim() || text.trim();
  }

  private tokenize(text: string): string[] {
    const stop = new Set([
      "and",
      "or",
      "the",
      "of",
      "with",
      "for",
      "a",
      "an",
      "in",
      "to",
    ]);
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !stop.has(t));
  }

  /** Fraction of query tokens found in the product name (0-1). */
  private scoreMatch(queryTokens: string[], productName: string): number {
    if (queryTokens.length === 0) {
      return 0;
    }

    const nameTokens = this.tokenize(productName);
    const nameSet = new Set(nameTokens);

    let matched = 0;
    for (const qt of queryTokens) {
      if (nameSet.has(qt)) {
        matched += 1;
      } else if (nameTokens.some((nt) => nt.startsWith(qt) || qt.startsWith(nt))) {
        matched += 0.5;
      }
    }

    return matched / queryTokens.length;
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

