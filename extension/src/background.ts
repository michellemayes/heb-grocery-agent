import type {
  ShoppingState,
  ItemState,
  ExtensionMessage,
  ItemUpdateMessage,
  LogMessage,
  LogEntry,
} from "./types";
import { parseShoppingList } from "./listParser";

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// A run is considered stalled if no progress has been reported for this long.
// When that happens we let a new "Start" reclaim the run instead of refusing it.
const STALE_RUN_MS = 90_000;

// Global shopping state
let shoppingState: ShoppingState = {
  isRunning: false,
  currentItemIndex: 0,
  items: [],
  logs: [],
  lastActivityAt: Date.now(),
};

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === "START_SHOPPING") {
      handleStartShopping(message.shoppingList, message.hebBrandOnly);
      sendResponse({ success: true });
    } else if (message.type === "CANCEL_SHOPPING") {
      handleCancelShopping();
      sendResponse({ success: true });
    } else if (message.type === "RESET_SHOPPING") {
      handleResetShopping();
      sendResponse({ success: true });
    } else if (message.type === "ITEM_UPDATE") {
      handleItemUpdate(message);
      sendResponse({ success: true });
    } else if (message.type === "LOG") {
      handleLog(message);
      sendResponse({ success: true });
    }
    return true;
  }
);

// Handle requests for current state
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    // Send initial state to popup
    port.postMessage({
      type: "STATE_UPDATE",
      state: shoppingState,
    });

    // Listen for state requests
    port.onMessage.addListener((msg) => {
      if (msg.type === "GET_STATE") {
        port.postMessage({
          type: "STATE_UPDATE",
          state: shoppingState,
        });
      }
    });
  }
});

function handleStartShopping(shoppingListText: string, hebBrandOnly = false) {
  if (shoppingState.isRunning) {
    const lastActivity = shoppingState.lastActivityAt ?? 0;
    const isStale = Date.now() - lastActivity > STALE_RUN_MS;

    if (!isStale) {
      addLog("error", "Shopping run already in progress");
      return;
    }

    // The previous run stalled (e.g. the tab was closed or a page failed to
    // load) and never reported completion. Reclaim it instead of getting
    // permanently stuck in a "running" state.
    addLog("warn", "Previous run appears to have stalled — starting a fresh run");
    clearRunState();
  }

  // Parse the shopping list
  const items = parseShoppingList(shoppingListText);

  // Initialize state
  shoppingState = {
    isRunning: true,
    currentItemIndex: 0,
    items: items.map((item) => ({
      item,
      state: "pending",
    })),
    logs: [],
    lastActivityAt: Date.now(),
  };

  addLog("info", `Starting shopping with ${items.length} items`);
  broadcastStateUpdate();

  // Find or create HEB tab
  chrome.tabs.query({ url: "https://www.heb.com/*" }, async (tabs) => {
    if (tabs.length > 0 && tabs[0].id) {
      // Use existing tab
      const tabId = tabs[0].id;
      chrome.tabs.update(tabId, { active: true }, async () => {
        // Ensure content script is injected (in case extension was just reloaded)
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content-script.js"],
          });
        } catch (error) {
          // Content script might already be injected, that's fine
          console.log("Content script injection skipped (may already exist)");
        }

        // Wait a moment for content script to initialize
        setTimeout(() => {
          sendMessageToTab(tabId, {
            type: "START_SHOPPING",
            shoppingList: shoppingListText,
            hebBrandOnly,
          });
        }, 500);
      });
    } else {
      // Create new tab
      chrome.tabs.create({ url: "https://www.heb.com" }, (tab) => {
        if (tab.id) {
          // Wait for the tab to load before sending message
          chrome.tabs.onUpdated.addListener(function listener(
            tabId,
            changeInfo
          ) {
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener);
              // Wait a moment for content script to initialize
              setTimeout(() => {
                sendMessageToTab(tab.id!, {
                  type: "START_SHOPPING",
                  shoppingList: shoppingListText,
                  hebBrandOnly,
                });
              }, 500);
            }
          });
        }
      });
    }
  });
}

function handleCancelShopping() {
  if (!shoppingState.isRunning) {
    return;
  }

  shoppingState.isRunning = false;
  addLog("warn", "Shopping run cancelled by user");
  broadcastStateUpdate();

  // Send cancel message to any HEB content scripts so they stop and clear state
  cancelContentScripts();
}

// Fully reset back to an idle, empty state. This is the user-facing escape
// hatch for a run that got stuck and won't clear on its own.
function handleResetShopping() {
  clearRunState();

  shoppingState = {
    isRunning: false,
    currentItemIndex: 0,
    items: [],
    logs: [],
    lastActivityAt: Date.now(),
  };

  chrome.storage.local.remove("contentScriptState");
  addLog("info", "Agent reset. Ready for a fresh run.");
  broadcastStateUpdate();
}

// Stop any in-flight content-script work without wiping the current UI state.
function clearRunState() {
  shoppingState.isRunning = false;
  cancelContentScripts();
}

function cancelContentScripts() {
  chrome.tabs.query({ url: "https://www.heb.com/*" }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        sendMessageToTab(tab.id, { type: "CANCEL_SHOPPING" });
      }
    }
  });
}

function handleItemUpdate(message: ItemUpdateMessage) {
  const { itemIndex, state, detail, error } = message;

  if (itemIndex >= 0 && itemIndex < shoppingState.items.length) {
    shoppingState.items[itemIndex] = {
      ...shoppingState.items[itemIndex],
      state,
      detail,
      error,
    };

    if (state === "completed" || state === "error") {
      shoppingState.currentItemIndex = itemIndex + 1;

      // Check if all items are done
      if (shoppingState.currentItemIndex >= shoppingState.items.length) {
        shoppingState.isRunning = false;
        addLog("info", "Shopping run completed");
      }
    }

    broadcastStateUpdate();
  }
}

function handleLog(message: LogMessage) {
  addLog(message.level, message.message);
}

function addLog(level: LogEntry["level"], message: string) {
  const log: LogEntry = {
    id: crypto.randomUUID(),
    level,
    message,
    timestamp: Date.now(),
  };

  shoppingState.logs.push(log);

  // Keep only last 100 logs
  if (shoppingState.logs.length > 100) {
    shoppingState.logs = shoppingState.logs.slice(-100);
  }

  broadcastStateUpdate();
}

function broadcastStateUpdate() {
  // Record activity so a genuinely stalled run can be detected later
  shoppingState.lastActivityAt = Date.now();

  // Save to storage for persistence
  chrome.storage.local.set({ shoppingState });

  // Broadcast to all connected ports (popups)
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    state: shoppingState,
  }).catch(() => {
    // Ignore errors if no popup is open
  });
}

async function sendMessageToTab(
  tabId: number,
  message: ExtensionMessage,
  retries = 3
) {
  for (let i = 0; i < retries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    } catch (error) {
      console.error(`Failed to send message to tab (attempt ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  
  addLog("error", "Failed to communicate with HEB.com. Please refresh the page and try again.");
  shoppingState.isRunning = false;
  broadcastStateUpdate();
}

// Load saved state on startup
chrome.storage.local.get("shoppingState", (result) => {
  if (result.shoppingState) {
    shoppingState = result.shoppingState;
    // Don't resume running state after browser restart
    if (shoppingState.isRunning) {
      shoppingState.isRunning = false;
    }
  }
});

// Export for debugging
(globalThis as any).__SHOPPING_STATE__ = shoppingState;

