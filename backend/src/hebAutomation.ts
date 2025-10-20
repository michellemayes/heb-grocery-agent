import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { GroceryListItem, ShoppingRunEvent } from "heb-grocery-shared";
import { chromium as chromiumExtra } from "playwright-extra";
import type { BrowserContext, Locator, Page } from "playwright";

export interface HebAutomationOptions {
  userDataDir?: string;
  headless?: boolean;
  slowMo?: number;
  navigationTimeoutMs?: number;
}

const DEFAULT_USER_DATA_DIR = path.join(
  os.homedir(),
  ".cache",
  "heb-grocery-agent",
  "chromium",
);

const PRODUCT_CARD_SELECTORS = [
  "[data-qa='product-card']",
  "[data-automation-id='product-card']",
  "[data-test='product-card']",
  ".product-grid__item",
  ".product-item",
  ".product-card",
];

export class HebAutomation {
  private context?: BrowserContext;
  private page?: Page;
  private readonly options: Required<HebAutomationOptions>;

  constructor(options?: HebAutomationOptions) {
    this.options = {
      userDataDir: options?.userDataDir ?? DEFAULT_USER_DATA_DIR,
      headless: options?.headless ?? false,
      slowMo: options?.slowMo ?? 0,
      navigationTimeoutMs: options?.navigationTimeoutMs ?? 20_000,
    };
  }

  async init(): Promise<void> {
    if (this.context) {
      return;
    }

    await fs.mkdir(this.options.userDataDir, { recursive: true });
    this.context = await chromiumExtra.launchPersistentContext(this.options.userDataDir, {
      headless: this.options.headless,
      slowMo: this.options.slowMo,
    });

    await this.applyStealthContext(this.context);

    const [existing] = this.context.pages();
    this.page = existing ?? (await this.context.newPage());
    this.page.setDefaultTimeout(this.options.navigationTimeoutMs);
  }

  async dispose(): Promise<void> {
    await this.context?.close();
    this.context = undefined;
    this.page = undefined;
  }

  async ensureReady(): Promise<Page> {
    if (!this.page) {
      await this.init();
    }

    if (!this.page) {
      throw new Error("Failed to initialize browser page");
    }

    return this.page;
  }

  async addItemToCart(
    item: GroceryListItem,
    emit: (event: ShoppingRunEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const page = await this.ensureReady();
    signal?.throwIfAborted?.();

    const query = encodeURIComponent(item.name);
    const searchUrl = `https://www.heb.com/search/?q=${query}`;
    emit({
      type: "log",
      level: "info",
      message: `Navigating to search results for "${item.name}".`,
    });

    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    signal?.throwIfAborted?.();

    await this.waitForProductGrid(page);
    const product = await this.pickFirstProductCard(page);
    const productName =
      (await product.locator("a, h2, h3, span, p").first().textContent())?.trim() ??
      item.name;
    emit({
      type: "log",
      level: "info",
      message: `Evaluating product "${productName}".`,
    });

    signal?.throwIfAborted?.();

    const addButton = product.locator("button").filter({
      hasText: /add/i,
    });

    if (!(await addButton.count())) {
      throw new Error("Could not locate an add-to-cart button for the product.");
    }

    await addButton.first().click();
    emit({
      type: "log",
      level: "info",
      message: `Clicked add-to-cart for "${productName}".`,
    });

    signal?.throwIfAborted?.();
    await page.waitForTimeout(1000);
  }

  private async applyStealthContext(context: BrowserContext): Promise<void> {
    const preparePage = async (page: Page) => {
      try {
        await page.addInitScript(() => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - executed in the browser context
          Object.defineProperty(navigator, "webdriver", { get: () => undefined });

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - executed in the browser context
          window.chrome = window.chrome || { runtime: {} };

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - executed in the browser context
          Object.defineProperty(navigator, "languages", {
            get: () => ["en-US", "en"],
          });

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - executed in the browser context
          Object.defineProperty(navigator, "plugins", {
            get: () => [1, 2, 3, 4, 5],
          });

        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to apply stealth script to page:", error);
      }
    };

    context.on("page", (page) => {
      void preparePage(page);
    });

    await Promise.all(context.pages().map((page) => preparePage(page)));
  }

  private async waitForProductGrid(page: Page): Promise<void> {
    for (const selector of PRODUCT_CARD_SELECTORS) {
      const locator = page.locator(selector);
      try {
        await locator.first().waitFor({ timeout: 8_000 });
        return;
      } catch {
        continue;
      }
    }

    throw new Error("Could not locate product results on the page.");
  }

  private async pickFirstProductCard(page: Page): Promise<Locator> {
    for (const selector of PRODUCT_CARD_SELECTORS) {
      const locator = page.locator(selector);
      if ((await locator.count()) > 0) {
        return locator.first();
      }
    }

    throw new Error("No product cards matched known selectors.");
  }
}
