import type { ShoppingState, ExtensionMessage } from "./types";

const EXAMPLE_LIST = `Groceries

[Canned Goods & Soups]
2 cups Chicken or Veg Broth

[Dairy]
1 cup Milk

[Frozen Food]
1 cup Frozen Peas

[Meat]
1 cup Rotisserie Chicken (roughly chopped or shredded)

[Produce]
1 large Sweet Onion (finely chopped)
1 cup Carrots (shredded or chopped)
1 cup Celery (finely chopped)

[Other]
1 cup uncooked Orzo
1/2 cup Parmigiano (grated)`;

class PopupUI {
  private shoppingListInput: HTMLTextAreaElement;
  private startBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private loadExampleBtn: HTMLButtonElement;
  private clearLogsBtn: HTMLButtonElement;
  private statusBadge: HTMLDivElement;
  private itemCount: HTMLSpanElement;
  private itemsList: HTMLDivElement;
  private logsList: HTMLDivElement;

  private port: chrome.runtime.Port | null = null;
  private currentState: ShoppingState = {
    isRunning: false,
    currentItemIndex: 0,
    items: [],
    logs: [],
  };

  constructor() {
    // Get DOM elements
    this.shoppingListInput = document.getElementById(
      "shoppingListInput"
    ) as HTMLTextAreaElement;
    this.startBtn = document.getElementById("startBtn") as HTMLButtonElement;
    this.cancelBtn = document.getElementById("cancelBtn") as HTMLButtonElement;
    this.loadExampleBtn = document.getElementById(
      "loadExampleBtn"
    ) as HTMLButtonElement;
    this.clearLogsBtn = document.getElementById(
      "clearLogsBtn"
    ) as HTMLButtonElement;
    this.statusBadge = document.getElementById("statusBadge") as HTMLDivElement;
    this.itemCount = document.getElementById("itemCount") as HTMLSpanElement;
    this.itemsList = document.getElementById("itemsList") as HTMLDivElement;
    this.logsList = document.getElementById("logsList") as HTMLDivElement;

    this.setupEventListeners();
    this.connectToBackground();
  }

  private setupEventListeners() {
    this.startBtn.addEventListener("click", () => this.handleStart());
    this.cancelBtn.addEventListener("click", () => this.handleCancel());
    this.loadExampleBtn.addEventListener("click", () =>
      this.handleLoadExample()
    );
    this.clearLogsBtn.addEventListener("click", () => this.handleClearLogs());
  }

  private connectToBackground() {
    this.port = chrome.runtime.connect({ name: "popup" });

    this.port.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === "STATE_UPDATE") {
        this.currentState = message.state;
        this.updateUI();
      }
    });

    // Request initial state
    this.port.postMessage({ type: "GET_STATE" });

    // Also listen for broadcast updates
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === "STATE_UPDATE") {
        this.currentState = message.state;
        this.updateUI();
      }
    });
  }

  private async handleStart() {
    const shoppingList = this.shoppingListInput.value.trim();
    if (!shoppingList) {
      alert("Please enter a shopping list");
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: "START_SHOPPING",
        shoppingList,
      });
    } catch (error) {
      console.error("Failed to start shopping:", error);
      alert("Failed to start shopping. Please try again.");
    }
  }

  private async handleCancel() {
    try {
      await chrome.runtime.sendMessage({
        type: "CANCEL_SHOPPING",
      });
    } catch (error) {
      console.error("Failed to cancel shopping:", error);
    }
  }

  private handleLoadExample() {
    this.shoppingListInput.value = EXAMPLE_LIST;
  }

  private handleClearLogs() {
    this.currentState.logs = [];
    this.updateUI();
  }

  private updateUI() {
    this.updateStatus();
    this.updateButtons();
    this.updateItems();
    this.updateLogs();
  }

  private updateStatus() {
    const { isRunning, currentItemIndex, items } = this.currentState;

    if (isRunning) {
      this.statusBadge.textContent = `Status: Running (${currentItemIndex + 1}/${items.length})`;
      this.statusBadge.className = "status-badge status-running";
    } else if (items.length > 0) {
      const completed = items.filter((i) => i.state === "completed").length;
      const errors = items.filter((i) => i.state === "error").length;
      this.statusBadge.textContent = `Status: Completed (${completed} items, ${errors} errors)`;
      this.statusBadge.className = "status-badge status-completed";
    } else {
      this.statusBadge.textContent = "Status: Idle";
      this.statusBadge.className = "status-badge status-idle";
    }
  }

  private updateButtons() {
    const { isRunning } = this.currentState;

    this.startBtn.disabled = isRunning;
    this.cancelBtn.disabled = !isRunning;
    this.shoppingListInput.disabled = isRunning;
    this.loadExampleBtn.disabled = isRunning;
  }

  private updateItems() {
    const { items } = this.currentState;

    this.itemCount.textContent = `${items.length} items`;

    if (items.length === 0) {
      this.itemsList.innerHTML =
        '<div class="empty-state">Items will appear once you start shopping</div>';
      return;
    }

    this.itemsList.innerHTML = items
      .map((itemState, index) => {
        const { item, state, detail, error } = itemState;
        const stateClass = `state-${state}`;

        return `
        <div class="item-card">
          <div class="item-header">
            <div class="item-name">${this.escapeHtml(item.name)}</div>
            <span class="state-badge ${stateClass}">${state.replace(/-/g, " ")}</span>
          </div>
          ${item.category ? `<div class="item-category">${this.escapeHtml(item.category)}</div>` : ""}
          ${item.quantity ? `<div class="item-quantity">${item.quantity}${item.unit ? ` ${item.unit}` : ""}</div>` : ""}
          ${item.notes ? `<div class="item-notes">${this.escapeHtml(item.notes)}</div>` : ""}
          ${detail ? `<div class="item-detail">${this.escapeHtml(detail)}</div>` : ""}
          ${error ? `<div class="item-error">${this.escapeHtml(error)}</div>` : ""}
        </div>
      `;
      })
      .join("");
  }

  private updateLogs() {
    const { logs } = this.currentState;

    if (logs.length === 0) {
      this.logsList.innerHTML = '<div class="empty-state">Logs will appear here</div>';
      return;
    }

    // Show latest 50 logs
    const recentLogs = logs.slice(-50).reverse();

    this.logsList.innerHTML = recentLogs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        return `
        <div class="log-entry log-${log.level}">
          <span class="log-time">${time}</span>
          <span class="log-message">${this.escapeHtml(log.message)}</span>
        </div>
      `;
      })
      .join("");
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new PopupUI());
} else {
  new PopupUI();
}

