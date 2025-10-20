import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type GroceryListItem,
  type ItemProgressState,
  type RunLifecycleStatus,
  type ShoppingRunEvent,
} from "heb-grocery-shared";
import { io, type Socket } from "socket.io-client";

import "./App.css";

type ItemState = {
  item: GroceryListItem;
  state: ItemProgressState;
  detail?: string;
  error?: string;
};

type LogEntry = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: Date;
};

declare global {
  interface Window {
    __BACKEND_URL__?: string;
  }
}

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

const BACKEND_URL =
  (typeof window !== "undefined" && window.__BACKEND_URL__) ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";

export function App() {
  const [shoppingList, setShoppingList] = useState(EXAMPLE_LIST);
  const [status, setStatus] = useState<RunLifecycleStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<Map<string, ItemState>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const logBottomRef = useRef<HTMLDivElement | null>(null);

  const appendLog = useCallback((level: LogEntry["level"], message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setLogs((prev) => [
      ...prev,
      { id, level, message, timestamp: new Date() },
    ]);
  }, []);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    const handleEvent = (event: ShoppingRunEvent) => {
      switch (event.type) {
        case "plan": {
          setItems(
            new Map(
              event.items.map((item) => [
                item.raw,
                { item, state: "pending" } satisfies ItemState,
              ]),
            ),
          );
          appendLog("info", `Parsed ${event.items.length} items from the list.`);
          break;
        }
        case "item-status": {
          setItems((prev) => {
            const next = new Map(prev);
            const key = event.item.raw;
            const existing = next.get(key) ?? { item: event.item, state: "pending" };
            next.set(key, {
              ...existing,
              item: event.item,
              state: event.state,
              detail: event.detail,
              error: undefined,
            });
            return next;
          });
          if (event.detail) {
            appendLog("info", event.detail);
          }
          break;
        }
        case "item-error": {
          setItems((prev) => {
            const next = new Map(prev);
            next.set(event.item.raw, {
              item: event.item,
              state: "error",
              error: event.error,
            });
            return next;
          });
          appendLog("error", `${event.item.name}: ${event.error}`);
          break;
        }
        case "run-status": {
          setStatus(event.status);
          if (event.message) {
            appendLog(event.status === "error" ? "error" : "info", event.message);
          }
          if (event.status === "completed" || event.status === "error") {
            setIsSubmitting(false);
          }
          break;
        }
        case "log": {
          appendLog(event.level, event.message);
          break;
        }
        default:
          break;
      }
    };

    socket.on("run-event", handleEvent);

    return () => {
      socket.off("run-event", handleEvent);
      socket.disconnect();
    };
  }, [appendLog]);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStart = async () => {
    if (!shoppingList.trim()) {
      setError("Please provide a shopping list.");
      return;
    }
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setLogs([]);
    setItems(new Map());
    setStatus("starting");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shoppingList }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to start the automation run.");
      }

      const body = (await response.json()) as { runId: string };
      setRunId(body.runId);
      socketRef.current?.emit("join-run", body.runId);
      appendLog("info", "Shopping agent started. Watch the HEB browser window.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start the automation run.";
      setError(message);
      appendLog("error", message);
      setIsSubmitting(false);
      setStatus("error");
    }
  };

  const handleCancel = () => {
    if (runId) {
      socketRef.current?.emit("cancel-run", runId);
      appendLog("warn", "Cancellation requested.");
    }
  };

  const isRunning = status === "in-progress" || status === "starting";

  const orderedItems = useMemo(() => Array.from(items.values()), [items]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>HEB Grocery Agent</h1>
        <p className="subtitle">
          Paste any grocery list. The agent will parse it, shop on HEB.com in a live
          browser, and add matches to your cart.
        </p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>1. Prepare</h2>
        </div>
        <ul className="prep-list">
          <li>Ensure you are signed into HEB.com in the agent-controlled browser.</li>
          <li>Select your preferred store, pickup, or delivery options manually.</li>
          <li>Keep the browser window visible to monitor the automation.</li>
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>2. Provide Your List</h2>
          <div className="actions">
            <button
              className="btn"
              type="button"
              onClick={() => setShoppingList(EXAMPLE_LIST)}
              disabled={isRunning}
            >
              Load Example
            </button>
          </div>
        </div>
        <textarea
          className="list-input"
          value={shoppingList}
          onChange={(event) => setShoppingList(event.target.value)}
          rows={14}
          placeholder="Paste or type your grocery list..."
          disabled={isRunning}
        />
        <div className="form-footer">
          <div className={`status-badge status-${status}`}>
            Status: {status.replace("-", " ")}
          </div>
          <div className="form-actions">
            <button
              className="btn secondary"
              type="button"
              onClick={handleCancel}
              disabled={!isRunning}
            >
              Cancel Run
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={handleStart}
              disabled={isRunning}
            >
              {isRunning ? "Running…" : "Start Shopping"}
            </button>
          </div>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>3. Parsed Items</h2>
          <span className="item-count">{orderedItems.length} items</span>
        </div>
        <div className="items-table">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orderedItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state">
                    Items will appear once the run starts.
                  </td>
                </tr>
              ) : (
                orderedItems.map(({ item, state, detail, error: itemError }) => (
                  <tr key={item.raw}>
                    <td>
                      <div className="item-name">{item.name}</div>
                      {item.notes ? <div className="item-notes">{item.notes}</div> : null}
                    </td>
                    <td>{item.category ?? "—"}</td>
                    <td>
                      {item.quantity
                        ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
                        : "—"}
                    </td>
                    <td>
                      <span className={`state-tag state-${state}`}>
                        {state.replace(/-/g, " ")}
                      </span>
                      {detail ? <div className="state-detail">{detail}</div> : null}
                      {itemError ? (
                        <div className="state-detail error">{itemError}</div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>4. Live Agent Log</h2>
        </div>
        <div className="log-view">
          {logs.length === 0 ? (
            <div className="empty-state">Logs will appear when the agent runs.</div>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className={`log-entry level-${entry.level}`}>
                <span className="timestamp">
                  {entry.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span className="log-message">{entry.message}</span>
              </div>
            ))
          )}
          <div ref={logBottomRef} />
        </div>
      </section>
    </div>
  );
}

export default App;
