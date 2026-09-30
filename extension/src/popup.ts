import { cleanShoppingListWithAI } from "./aiCleaner";
import { applyCleanup, cleanShoppingList, getCleanupSummary } from "./listCleaner";
import type {
  AIProvider,
  CleanupDiff,
  CleanupSettings,
  PanelMessage,
  ShoppingState,
  StateUpdateMessage,
} from "./types";

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

const DRAFT_KEY = "draftList";

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id} in popup.html`);
  }
  return element as T;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class PanelUI {
  private readonly listInput = byId<HTMLTextAreaElement>("shoppingListInput");
  private readonly hebBrandOnly = byId<HTMLInputElement>("hebBrandOnlyCheckbox");
  private readonly startBtn = byId<HTMLButtonElement>("startBtn");
  private readonly cancelBtn = byId<HTMLButtonElement>("cancelBtn");
  private readonly resetBtn = byId<HTMLButtonElement>("resetBtn");
  private readonly loadExampleBtn = byId<HTMLButtonElement>("loadExampleBtn");
  private readonly clearLogsBtn = byId<HTMLButtonElement>("clearLogsBtn");
  private readonly statusBadge = byId<HTMLDivElement>("statusBadge");
  private readonly itemCount = byId<HTMLSpanElement>("itemCount");
  private readonly itemsList = byId<HTMLDivElement>("itemsList");
  private readonly logsList = byId<HTMLDivElement>("logsList");

  private readonly cleanListBtn = byId<HTMLButtonElement>("cleanListBtn");
  private readonly settingsBtn = byId<HTMLButtonElement>("settingsBtn");
  private readonly settingsModal = byId<HTMLDivElement>("settingsModal");
  private readonly closeSettingsBtn = byId<HTMLButtonElement>("closeSettingsBtn");
  private readonly saveSettingsBtn = byId<HTMLButtonElement>("saveSettingsBtn");
  private readonly enableCleanup = byId<HTMLInputElement>("enableCleanupCheckbox");
  private readonly providerSelect = byId<HTMLSelectElement>("aiProviderSelect");
  private readonly apiKeyInput = byId<HTMLInputElement>("apiKeyInput");
  private readonly apiKeyGroup = byId<HTMLDivElement>("apiKeyGroup");
  private readonly cleanupModal = byId<HTMLDivElement>("cleanupModal");
  private readonly closeCleanupBtn = byId<HTMLButtonElement>("closeCleanupBtn");
  private readonly cancelCleanupBtn = byId<HTMLButtonElement>("cancelCleanupBtn");
  private readonly applyCleanupBtn = byId<HTMLButtonElement>("applyCleanupBtn");
  private readonly cleanupSummary = byId<HTMLDivElement>("cleanupSummary");
  private readonly cleanupChanges = byId<HTMLDivElement>("cleanupChanges");

  private state: ShoppingState = { isRunning: false, currentItemIndex: 0, items: [], logs: [] };
  private cleanupDiff: CleanupDiff | null = null;
  private settings: CleanupSettings = { enabled: false, provider: "none", apiKey: "" };
  private lastScrolledIndex = -1;

  constructor() {
    this.bindEvents();
    this.connect();
    this.loadPreferences().catch(console.error);
  }

  private bindEvents() {
    this.startBtn.addEventListener("click", () => this.start());
    this.cancelBtn.addEventListener("click", () => this.send({ type: "CANCEL_SHOPPING" }));
    this.resetBtn.addEventListener("click", () => this.send({ type: "RESET_SHOPPING" }));
    this.clearLogsBtn.addEventListener("click", () => this.send({ type: "CLEAR_LOGS" }));
    this.loadExampleBtn.addEventListener("click", () => {
      this.listInput.value = EXAMPLE_LIST;
      this.saveDraft();
    });
    this.listInput.addEventListener("input", () => this.saveDraft());

    this.cleanListBtn.addEventListener("click", () => this.cleanList());
    this.settingsBtn.addEventListener("click", () => this.settingsModal.classList.remove("hidden"));
    this.closeSettingsBtn.addEventListener("click", () => this.settingsModal.classList.add("hidden"));
    this.saveSettingsBtn.addEventListener("click", () => this.saveSettings());
    this.providerSelect.addEventListener("change", () => this.updateApiKeyVisibility());

    this.closeCleanupBtn.addEventListener("click", () => this.closeCleanupModal());
    this.cancelCleanupBtn.addEventListener("click", () => this.closeCleanupModal());
    this.applyCleanupBtn.addEventListener("click", () => {
      if (this.cleanupDiff) {
        this.listInput.value = applyCleanup(this.cleanupDiff);
        this.saveDraft();
      }
      this.closeCleanupModal();
    });
  }

  /**
   * The port delivers the current state on connect (and wakes the service
   * worker); later changes arrive as broadcasts.
   */
  private connect() {
    const onState = (message: StateUpdateMessage) => {
      if (message?.type === "STATE_UPDATE") {
        this.state = message.state;
        this.render();
      }
    };
    chrome.runtime.connect({ name: "panel" }).onMessage.addListener(onState);
    chrome.runtime.onMessage.addListener(onState);
  }

  private async send(message: PanelMessage) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (response && !response.ok) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error(`${message.type} failed:`, error);
      alert(`Something went wrong: ${errorMessage(error)}`);
    }
  }

  private async start() {
    const shoppingList = this.listInput.value.trim();
    if (!shoppingList) {
      alert("Please enter a shopping list");
      return;
    }
    const hebBrandOnly = this.hebBrandOnly.checked;
    await chrome.storage.local.set({ hebBrandOnly });
    await this.send({ type: "START_SHOPPING", shoppingList, hebBrandOnly });
  }

  private saveDraft() {
    chrome.storage.local.set({ [DRAFT_KEY]: this.listInput.value }).catch(console.error);
  }

  private async loadPreferences() {
    const stored = await chrome.storage.local.get(["hebBrandOnly", "cleanupSettings", DRAFT_KEY]);
    this.hebBrandOnly.checked = Boolean(stored.hebBrandOnly);
    if (typeof stored[DRAFT_KEY] === "string" && !this.listInput.value) {
      this.listInput.value = stored[DRAFT_KEY];
    }
    if (stored.cleanupSettings) {
      this.settings = stored.cleanupSettings as CleanupSettings;
      this.enableCleanup.checked = this.settings.enabled;
      this.providerSelect.value = this.settings.provider;
      this.apiKeyInput.value = this.settings.apiKey;
    }
    this.updateApiKeyVisibility();
  }

  private updateApiKeyVisibility() {
    this.apiKeyGroup.hidden = this.providerSelect.value === "none";
  }

  private async saveSettings() {
    this.settings = {
      enabled: this.enableCleanup.checked,
      provider: this.providerSelect.value as AIProvider,
      apiKey: this.apiKeyInput.value.trim(),
    };
    await chrome.storage.local.set({ cleanupSettings: this.settings });
    this.settingsModal.classList.add("hidden");
  }

  private async cleanList() {
    const listText = this.listInput.value.trim();
    if (!listText) {
      alert("Please enter a shopping list first");
      return;
    }

    const { enabled, provider, apiKey } = this.settings;
    const useAI = enabled && provider !== "none" && Boolean(apiKey);

    this.cleanListBtn.disabled = true;
    this.setCleanButtonText("Cleaning...");
    try {
      let diff: CleanupDiff;
      try {
        diff = useAI
          ? await cleanShoppingListWithAI(listText, provider, apiKey)
          : cleanShoppingList(listText);
      } catch (error) {
        alert(`AI cleanup failed: ${errorMessage(error)}\n\nUsing string matching instead.`);
        diff = cleanShoppingList(listText);
      }
      this.cleanupDiff = diff;
      this.showCleanupPreview(diff);
    } finally {
      this.cleanListBtn.disabled = false;
      this.setCleanButtonText("Clean List");
    }
  }

  private setCleanButtonText(text: string) {
    const label = this.cleanListBtn.querySelector(".btn-text-content");
    if (label) {
      label.textContent = text;
    }
  }

  private showCleanupPreview(diff: CleanupDiff) {
    const summary = getCleanupSummary(diff);
    const rows: [string, string | number][] = [
      ["Method", diff.method === "ai" ? "AI" : "String matching"],
      ["Total items", summary.total],
      ["Fixed typos", summary.fixed],
      ["Standardized", summary.standardized],
      ["Removed", summary.removed],
      ["Unchanged", summary.unchanged],
    ];
    this.cleanupSummary.innerHTML = rows
      .map(
        ([label, value]) => `
        <div class="cleanup-summary-row">
          <span class="cleanup-summary-label">${label}:</span>
          <span class="cleanup-summary-value">${value}</span>
        </div>`,
      )
      .join("");

    this.cleanupChanges.innerHTML = diff.changes
      .map((change) => {
        const changed = change.type === "fixed" || change.type === "standardized";
        return `
        <div class="cleanup-change change-${change.type}">
          <div class="cleanup-change-header">
            <span class="cleanup-change-type">${change.type}</span>
          </div>
          <div class="cleanup-change-text">${escapeHtml(change.original)}</div>
          ${
            changed
              ? `<div class="cleanup-change-arrow">↓</div>
                 <div class="cleanup-change-text">${escapeHtml(change.cleaned)}</div>`
              : ""
          }
          ${change.reason ? `<div class="cleanup-change-reason">${escapeHtml(change.reason)}</div>` : ""}
        </div>`;
      })
      .join("");

    this.cleanupModal.classList.remove("hidden");
  }

  private closeCleanupModal() {
    this.cleanupModal.classList.add("hidden");
    this.cleanupDiff = null;
  }

  private render() {
    const { isRunning } = this.state;
    this.startBtn.disabled = isRunning;
    this.cancelBtn.disabled = !isRunning;
    this.listInput.disabled = isRunning;
    this.hebBrandOnly.disabled = isRunning;
    this.loadExampleBtn.disabled = isRunning;
    this.cleanListBtn.disabled = isRunning;

    this.renderStatus();
    this.renderItems();
    this.renderLogs();
  }

  private renderStatus() {
    const { isRunning, currentItemIndex, items } = this.state;
    if (isRunning) {
      this.statusBadge.textContent = `Running (${Math.min(currentItemIndex + 1, items.length)}/${items.length})`;
      this.statusBadge.className = "status-badge status-running";
    } else if (items.length > 0) {
      const added = items.filter((i) => i.state === "completed").length;
      const failed = items.filter((i) => i.state === "error").length;
      this.statusBadge.textContent = `Done: ${added} added, ${failed} failed`;
      this.statusBadge.className = "status-badge status-completed";
    } else {
      this.statusBadge.textContent = "Idle";
      this.statusBadge.className = "status-badge status-idle";
    }
  }

  private renderItems() {
    const { items, isRunning, currentItemIndex } = this.state;
    this.itemCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;

    if (items.length === 0) {
      this.itemsList.innerHTML =
        '<div class="empty-state">Items will appear once you start shopping</div>';
      this.lastScrolledIndex = -1;
      return;
    }

    this.itemsList.innerHTML = items
      .map(({ item, state, detail, error }, index) => {
        const active = isRunning && index === currentItemIndex;
        const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : "";
        return `
        <div class="item-card ${active ? "item-card-active" : ""}" data-item-index="${index}">
          <div class="item-header">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <span class="state-badge state-${state}">${state.replace(/-/g, " ")}</span>
          </div>
          ${item.category ? `<div class="item-category">${escapeHtml(item.category)}</div>` : ""}
          ${quantity ? `<div class="item-quantity">${escapeHtml(quantity)}</div>` : ""}
          ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ""}
          ${detail ? `<div class="item-detail">${escapeHtml(detail)}</div>` : ""}
          ${error ? `<div class="item-error">${escapeHtml(error)}</div>` : ""}
        </div>`;
      })
      .join("");

    // Only scroll when the active item changes, so the user can scroll freely otherwise.
    if (isRunning && currentItemIndex !== this.lastScrolledIndex) {
      this.lastScrolledIndex = currentItemIndex;
      this.itemsList
        .querySelector(`[data-item-index="${currentItemIndex}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  private renderLogs() {
    const { logs } = this.state;
    if (logs.length === 0) {
      this.logsList.innerHTML = '<div class="empty-state">Logs will appear here</div>';
      return;
    }

    this.logsList.innerHTML = logs
      .slice(-50)
      .reverse()
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        return `
        <div class="log-entry log-${log.level}">
          <span class="log-time">${time}</span>
          <span class="log-message">${escapeHtml(log.message)}</span>
        </div>`;
      })
      .join("");
  }
}

new PanelUI();
