// Runs on heb.com pages. It keeps no state of its own: the background worker
// navigates the tab to a search page, then asks this script to add the best
// matching product. A reload or navigation can never leave a half-finished run
// behind here.

import { pickBestMatch } from "./searchQuery";
import type { AddItemRequest, AddItemResult } from "./types";

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

const ADD_BUTTON_SELECTORS = [
  'button[data-qe-id="addToCart"]',
  'button[data-qe-id*="add"]',
  'button[aria-label*="Add"]',
  'button[class*="addToCart"]',
  'button[class*="AddToCart"]',
];

const PRODUCT_GRID_TIMEOUT_MS = 15_000;
const MAX_CANDIDATES = 12;

declare global {
  interface Window {
    __hebAgentLoaded?: boolean;
  }
}

// Guard against a second copy of this script registering a second listener,
// which would add every item to the cart twice.
if (!window.__hebAgentLoaded) {
  window.__hebAgentLoaded = true;

  chrome.runtime.onMessage.addListener((message: AddItemRequest, _sender, sendResponse) => {
    if (message?.type !== "ADD_ITEM") {
      return false;
    }
    addItem(message.query).then(sendResponse, (error: unknown) =>
      sendResponse({ ok: false, error: errorMessage(error) } satisfies AddItemResult),
    );
    return true; // respond asynchronously
  });
}

async function addItem(query: string): Promise<AddItemResult> {
  const cards = await waitForProductCards();
  if (cards.length === 0) {
    return { ok: false, error: "No products found" };
  }

  const names = cards.map(getProductName);
  const index = pickBestMatch(query, names);
  const card = cards[index];
  const productName = names[index] || query;

  const button = findAddButton(card);
  if (!button) {
    return { ok: false, error: `No "Add to cart" button for "${productName}"` };
  }
  if (button.disabled) {
    return { ok: false, error: `"${productName}" is unavailable` };
  }

  await click(button);
  return { ok: true, productName };
}

async function waitForProductCards(): Promise<HTMLElement[]> {
  const deadline = Date.now() + PRODUCT_GRID_TIMEOUT_MS;
  while (Date.now() < deadline) {
    for (const selector of PRODUCT_CARD_SELECTORS) {
      const cards = document.querySelectorAll<HTMLElement>(selector);
      if (cards.length > 0) {
        return Array.from(cards).slice(0, MAX_CANDIDATES);
      }
    }
    await sleep(200);
  }
  throw new Error("Timed out waiting for search results");
}

function getProductName(card: HTMLElement): string {
  for (const selector of ["a", "h2", "h3", "span", "p"]) {
    const text = card.querySelector(selector)?.textContent?.trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function findAddButton(card: HTMLElement): HTMLButtonElement | null {
  for (const selector of ADD_BUTTON_SELECTORS) {
    const button = card.querySelector<HTMLButtonElement>(selector);
    if (button) {
      return button;
    }
  }
  return (
    Array.from(card.querySelectorAll("button")).find((b) =>
      /add.*cart/i.test(b.textContent ?? ""),
    ) ?? null
  );
}

/** Dispatch the full mouse sequence a real click produces, not just a `click` event. */
async function click(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ block: "center" });
  await sleep(150);

  const rect = element.getBoundingClientRect();
  const init: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
  for (const type of ["mouseover", "mousedown", "mouseup", "click"]) {
    element.dispatchEvent(new MouseEvent(type, init));
    await sleep(50);
  }
  // Give the cart request time to go out before the tab navigates away.
  await sleep(800);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
