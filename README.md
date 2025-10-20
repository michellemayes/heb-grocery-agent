# HEB Grocery Agent

**Note:** This was a dead end because HEB immediately blocked my playwright browser tab.


Local-first agent that reads free-form grocery lists, parses them into structured items, and drives a live Playwright-controlled browser session to shop on HEB.com for you. The app shows real-time progress in a React dashboard while you watch the automation add items to your cart.

## Prerequisites

- Node.js 18+ (tested with npm 11+)
- npm workspaces enabled (default in npm 7+)
- Playwright browser binaries (`npx playwright install chromium`)

## Quick Start

```bash
# Install root + all workspace deps (frontend/backend/shared)
npm install

# Download the Chromium binary used by Playwright
npx playwright install chromium

# Build shared types + backend + frontend bundles (optional for development, useful for verification)
npm run build

# Start the backend and frontend sandboxes (runs both in watch mode)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API & Socket.IO: http://localhost:4000
- If you browse to `http://localhost:4000` directly you will see `Cannot GET /`; that port is only for the API/Socket.IO. Use the Vite dev server (`http://localhost:5173`) for the UI.

### Development workflows

- `npm run dev:backend` — run just the Express/Playwright server with hot reload (tsx watch).
- `npm run dev:frontend` — run the Vite dev server.
- `npm run build` — build shared types, backend, and frontend for production.
- `npm run format` / `npm run lint` — run formatting/linting (backend + frontend). You can also run them per workspace (`npm run lint --workspace backend`).
- If you previously ran `npm install --workspaces` and see `concurrently: command not found`, re-run `npm install` to pull in the root toolchain dependencies.

## Using the Agent

1. Start `npm run dev` (or run backend/front separately).
2. The backend now pre-launches the Playwright Chromium window. Take a moment to sign into HEB.com manually, set your store / fulfillment preferences, and keep the browser open before triggering a run.
3. Paste any grocery list into the UI (supports section headers like `[Produce]`, bullets, numbered lists, and quantities such as `1/2 cup`).
4. Click **Start Shopping**. The dashboard shows parsed items and live logs while the browser performs searches and clicks **Add to Cart**.
5. Use **Cancel Run** if you need to take over manually.

## Architecture

- **Frontend (React + Vite)** — Collects the list, visualizes parsed items and state badges, and streams log events via Socket.IO.
- **Backend (Express + Socket.IO + Playwright Extra)** — Parses input, orchestrates the shopping workflow, and controls a headed Chromium instance (with basic stealth tweaks applied) so the user can monitor actions.
- **Shared package** — TypeScript definitions for grocery items and event payloads shared between client/server.

See `docs/architecture.md` for a deeper breakdown of modules and data flow.

## Limitations & Next Steps

- Product selection currently picks the first available search result. More sophisticated ranking and substitution logic can be layered on.
- HEB may display unexpected modals (age verification, substitutions, etc.). The agent surfaces errors in the log, but additional handlers may be needed.
- Authentication/location must be handled manually by the user before kicking off a run.
- Some stealth-style tweaks (masking `navigator.webdriver`, etc.) are applied to reduce—but not eliminate—bot detection. Continue to respect HEB's Terms of Service and be prepared for manual fallback if the session is challenged.
- Automated tests are not included yet; consider adding Playwright fixtures to simulate the flow against a mocked storefront.
