// Service worker. Owns the shopping run: it navigates one HEB tab from search
// to search and asks the content script to add each item. All state lives
// here and is mirrored to chrome.storage so the side panel can re-render after
// the worker restarts.

import { parseShoppingList } from "./listParser";
import { buildSearchQuery, buildSearchUrl } from "./searchQuery";
import type {
  AddItemRequest,
  AddItemResult,
  ItemState,
  LogLevel,
  PanelMessage,
  ShoppingState,
  StateUpdateMessage,
} from "./types";

const PAGE_LOAD_TIMEOUT_MS = 30_000;
const ADD_ITEM_TIMEOUT_MS = 25_000;
const CONTENT_SCRIPT_ATTEMPTS = 5;
const DELAY_BETWEEN_ITEMS_MS = 500;
const MAX_LOGS = 100;

class RunStoppedError extends Error {}

class TabClosedError extends Error {
  constructor() {
    super("The HEB tab was closed");
  }
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

let state: ShoppingState = emptyState();

// The worker can be woken by a message before storage has been read. Every
// handler awaits this so it never acts on (or overwrites) a blank state.
const ready: Promise<void> = chrome.storage.local.get("shoppingState").then((result) => {
  const saved = result.shoppingState as ShoppingState | undefined;
  if (!saved) {
    return;
  }
  state = saved;
  if (state.isRunning) {
    // The worker was stopped mid-run (browser restart, extension reload or
    // Chrome reclaiming the worker). The loop that drove it is gone.
    state.isRunning = false;
    state.runId = undefined;
    markUnfinishedItems("Run was interrupted");
    log("warn", "The previous run was interrupted. Start again to finish the remaining items.");
  }
});

chrome.runtime.onMessage.addListener((message: PanelMessage, _sender, sendResponse) => {
  ready
    .then(() => handlePanelMessage(message))
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: errorMessage(error) }));
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "panel") {
    ready.then(() => port.postMessage(stateUpdate()));
  }
});

function handlePanelMessage(message: PanelMessage): void {
  switch (message.type) {
    case "START_SHOPPING":
      startRun(message.shoppingList, message.hebBrandOnly);
      break;
    case "CANCEL_SHOPPING":
      if (state.isRunning) {
        stopRun();
        markUnfinishedItems("Cancelled");
        log("warn", "Run cancelled");
      }
      break;
    case "RESET_SHOPPING":
      state = emptyState();
      publish();
      break;
    case "CLEAR_LOGS":
      state.logs = [];
      publish();
      break;
  }
}

function startRun(listText: string, hebBrandOnly: boolean): void {
  const items = parseShoppingList(listText);
  if (items.length === 0) {
    log("error", "No items found in the list");
    return;
  }

  // Starting always wins over a previous run, so a stuck run can never block
  // a new one. The old loop sees its runId change and exits.
  const runId = crypto.randomUUID();
  state = {
    isRunning: true,
    runId,
    currentItemIndex: 0,
    items: items.map((item) => ({ item, state: "pending" })),
    logs: [],
  };
  log("info", `Starting run with ${items.length} items`);

  runLoop(runId, hebBrandOnly).catch((error: unknown) => {
    if (error instanceof RunStoppedError || state.runId !== runId) {
      return;
    }
    markUnfinishedItems("Run stopped");
    log("error", `Run stopped: ${errorMessage(error)}`);
    stopRun();
  });
}

async function runLoop(runId: string, hebBrandOnly: boolean): Promise<void> {
  const tabId = await getShoppingTab();

  for (let i = 0; i < state.items.length; i++) {
    assertActive(runId);
    state.currentItemIndex = i;

    const { item } = state.items[i];
    const query = buildSearchQuery(item);

    try {
      updateItem(i, { state: "searching", detail: `Searching for "${query}"` });
      await navigate(tabId, buildSearchUrl(query, hebBrandOnly));
      assertActive(runId);

      updateItem(i, { state: "adding-to-cart", detail: "Choosing a product" });
      const result = await requestAddItem(tabId, query);
      assertActive(runId);

      if (result.ok) {
        updateItem(i, { state: "completed", detail: `Added "${result.productName}"` });
      } else {
        updateItem(i, { state: "error", detail: undefined, error: result.error });
        log("warn", `${item.name}: ${result.error}`);
      }
    } catch (error) {
      // Never write into a run that has since been cancelled or replaced.
      assertActive(runId);
      if (error instanceof TabClosedError || !(await tabExists(tabId))) {
        throw new TabClosedError();
      }
      // One bad page should not end the whole run.
      updateItem(i, { state: "error", detail: undefined, error: errorMessage(error) });
      log("warn", `${item.name}: ${errorMessage(error)}`);
    }

    await sleep(DELAY_BETWEEN_ITEMS_MS);
  }

  assertActive(runId);
  const failed = state.items.filter((i) => i.state === "error").length;
  state.currentItemIndex = state.items.length;
  log(
    failed ? "warn" : "info",
    failed
      ? `Finished: ${state.items.length - failed} added, ${failed} need attention`
      : `Finished: all ${state.items.length} items added`,
  );
  stopRun();
}

function assertActive(runId: string): void {
  if (!state.isRunning || state.runId !== runId) {
    throw new RunStoppedError();
  }
}

function stopRun(): void {
  state.isRunning = false;
  state.runId = undefined;
  publish();
}

// ---------------------------------------------------------------------------
// Tab control

async function getShoppingTab(): Promise<number> {
  const [existing] = await chrome.tabs.query({ url: "https://www.heb.com/*" });
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    return existing.id;
  }
  const created = await chrome.tabs.create({ url: "https://www.heb.com/" });
  if (created.id === undefined) {
    throw new Error("Could not open HEB.com");
  }
  return created.id;
}

function tabExists(tabId: number): Promise<boolean> {
  return chrome.tabs.get(tabId).then(
    () => true,
    () => false,
  );
}

/** Load `url` in the tab and resolve once the page has finished loading. */
function navigate(tabId: number, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };
    const onUpdated = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId && info.status === "complete") {
        cleanup();
        resolve();
      }
    };
    const onRemoved = (id: number) => {
      if (id === tabId) {
        cleanup();
        reject(new TabClosedError());
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("HEB.com took too long to load"));
    }, PAGE_LOAD_TIMEOUT_MS);

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.update(tabId, { url }).catch((error: unknown) => {
      cleanup();
      reject(error);
    });
  });
}

/**
 * Ask the content script to add the best match. The script may still be
 * starting when the page reports "complete", so retry the connection briefly.
 */
async function requestAddItem(tabId: number, query: string): Promise<AddItemResult> {
  const request: AddItemRequest = { type: "ADD_ITEM", query };

  for (let attempt = 1; ; attempt++) {
    try {
      return await withTimeout(
        chrome.tabs.sendMessage<AddItemRequest, AddItemResult>(tabId, request),
        ADD_ITEM_TIMEOUT_MS,
        "Timed out waiting for the page to respond",
      );
    } catch (error) {
      const notReady = errorMessage(error).includes("Receiving end does not exist");
      if (!notReady || attempt >= CONTENT_SCRIPT_ATTEMPTS) {
        throw notReady ? new Error("Could not connect to the HEB page. Try reloading it.") : error;
      }
      await sleep(500 * attempt);
    }
  }
}

// ---------------------------------------------------------------------------
// State

function emptyState(): ShoppingState {
  return { isRunning: false, currentItemIndex: 0, items: [], logs: [] };
}

function updateItem(index: number, patch: Partial<ItemState>): void {
  state.items[index] = { ...state.items[index], ...patch };
  publish();
}

function markUnfinishedItems(reason: string): void {
  state.items = state.items.map((i) =>
    i.state === "completed" || i.state === "error"
      ? i
      : { ...i, state: "error", detail: undefined, error: reason },
  );
}

function log(level: LogLevel, message: string): void {
  state.logs = [
    ...state.logs,
    { id: crypto.randomUUID(), level, message, timestamp: Date.now() },
  ].slice(-MAX_LOGS);
  publish();
}

function stateUpdate(): StateUpdateMessage {
  return { type: "STATE_UPDATE", state };
}

function publish(): void {
  chrome.storage.local.set({ shoppingState: state }).catch(console.error);
  // Rejects when the side panel is closed, which is fine.
  chrome.runtime.sendMessage(stateUpdate()).catch(() => {});
}

// ---------------------------------------------------------------------------
// Utilities

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
