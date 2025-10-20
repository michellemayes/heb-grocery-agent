import { randomUUID } from "node:crypto";
import http from "node:http";

import type { ShoppingRunEvent } from "heb-grocery-shared";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";

import { HebAutomation } from "./hebAutomation.js";
import { runShoppingList } from "./shoppingRun.js";

const PORT = Number.parseInt(process.env.PORT ?? "4000", 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const runRequestSchema = z.object({
  shoppingList: z.string().min(1, "Shopping list cannot be empty."),
});

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "500kb" }));

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [FRONTEND_ORIGIN],
    methods: ["GET", "POST"],
  },
});

const automation = new HebAutomation();
const activeRuns = new Map<
  string,
  { controller: AbortController; startedAt: number; listSample: string }
>();

void (async () => {
  try {
    await automation.init();
    const page = await automation.ensureReady();
    await page.goto("https://www.heb.com/", { waitUntil: "domcontentloaded" });
    // eslint-disable-next-line no-console
    console.log(
      "Playwright browser launched. Sign into HEB and set your store before starting a run.",
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to prelaunch automation browser:", error);
  }
})();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/run", async (req, res) => {
  const parseResult = runRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  if (activeRuns.size > 0) {
    return res.status(409).json({ error: "A shopping run is already in progress." });
  }

  const { shoppingList } = parseResult.data;
  const runId = randomUUID();
  const controller = new AbortController();

  activeRuns.set(runId, {
    controller,
    startedAt: Date.now(),
    listSample: shoppingList.slice(0, 120),
  });

  const emit = (event: ShoppingRunEvent): void => {
    io.to(runId).emit("run-event", event);
  };

  setTimeout(() => {
    runShoppingList({
      rawList: shoppingList,
      automation,
      emit,
      signal: controller.signal,
    })
      .catch((error) => {
        emit({
          type: "log",
          level: "error",
          message: `Run failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        emit({
          type: "run-status",
          status: "error",
          message: "The automation encountered an unrecoverable error.",
        });
      })
      .finally(() => {
        activeRuns.delete(runId);
      });
  }, 150);

  res.status(202).json({ runId });
});

io.on("connection", (socket) => {
  socket.on("join-run", (runId: string) => {
    socket.join(runId);
    if (!activeRuns.has(runId)) {
      socket.emit("run-event", {
        type: "run-status",
        status: "idle",
        message: "No active run.",
      } satisfies ShoppingRunEvent);
    }
  });

  socket.on("cancel-run", (runId: string) => {
    const run = activeRuns.get(runId);
    if (!run) {
      return;
    }

    run.controller.abort();
    socket.emit("run-event", {
      type: "run-status",
      status: "error",
      message: "Run cancelled by user.",
    } satisfies ShoppingRunEvent);
  });

  socket.on("disconnect", () => {
    // no-op for now; runs keep going even if the client disconnects.
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});

const shutdown = async () => {
  for (const { controller } of activeRuns.values()) {
    controller.abort();
  }
  await automation.dispose().catch(() => {});
  httpServer.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
