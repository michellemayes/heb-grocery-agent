# HEB Grocery Agent – Architecture Overview

## Goals
- Accept free-form grocery lists and extract a structured shopping plan.
- Automate HEB.com shopping flows without official APIs.
- Keep the user informed in real time and let them observe the live browser session.
- Run entirely on the user's machine.

## High-Level Design
- **Frontend (React + Vite app)**
  - Collects the grocery list input.
  - Shows parsed items, current task, per-item status, and agent logs streamed over WebSocket.
  - Provides controls to start/stop a run and instructions for prepping the HEB session (e.g. sign-in).
- **Backend (Node.js + Express + Socket.IO)**
  - REST endpoint to kick off a shopping run.
  - Emits structured progress events: plan creation, item processing, errors, and completion.
  - Orchestrates Playwright browser automation in headed mode so the user can watch the cart updates live.
- **Automation Layer (Playwright)**
  - Launches Chromium with a persistent profile to keep HEB authentication/session.
  - Navigates HEB.com, performs product searches, picks the best match (currently first in-stock hit), and adds it to the cart.
  - Shares telemetry (step name, screenshots-on-demand) back through the backend event stream.
- **List Parsing**
  - Deterministic parser that supports section headers `[Category]`, bullet/numbered items, quantities like `2 cups`, and inline notes.
  - Produces normalized items `{category?, name, quantity?, unit?, notes?}` for downstream automation.

## Data Flow
1. User submits a list in the frontend.
2. Frontend `POST /api/run` with raw list; backend parses and validates.
3. Backend spins up a `ShoppingRun` orchestrator:
   - Emits `plan` event with structured items.
   - Ensures Playwright browser is ready (headed).
   - Processes each item sequentially, emitting `item:start`, `item:progress`, `item:done` events.
4. Frontend listens via Socket.IO and updates the real-time dashboard.
5. Any recoverable error emits an `item:error`; fatal errors emit `run:error`.

## Key Components
- `backend/src/server.ts`: Express app, REST + Socket.IO wiring.
- `backend/src/shoppingRun.ts`: High-level orchestrator.
- `backend/src/listParser.ts`: Grocery list parser.
- `backend/src/hebAutomation.ts`: Playwright helpers (launch, search, add to cart).
- `frontend/src/App.tsx`: React entry point with workflow UI.
- Shared TypeScript types under `shared/`.

## Operational Notes
- Playwright runs in headed mode with persisted user data in `~/.cache/heb-grocery-agent`. On first run, the user must sign into HEB and set a preferred store/fulfillment option; the agent resumes afterward.
- Error handling favors transparency: the run stops on unhandled errors while leaving the browser open for manual intervention.
- Future enhancements: smarter product ranking, substitution handling, multi-threaded item processing, test suite with Playwright fixtures, optional LLM delegate for ambiguous list entries.
