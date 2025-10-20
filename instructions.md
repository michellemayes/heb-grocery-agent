# HEB Grocery Agent — Quick Instructions

## 1. Install prerequisites
- Install Node.js 18 or newer (`node -v`).
- Fetch Playwright’s Chromium binary once: `npx playwright install chromium`.

## 2. Install project dependencies
```bash
npm install
```
This installs the root dependencies (including the `concurrently` dev script runner) and bootstraps the `backend`, `frontend`, and `shared` workspaces in one step. If you used an older npm command before (e.g., `npm install --workspaces`) and hit a `concurrently: command not found` error, re-run `npm install` so the root toolchain gets installed.

## 3. Start the dev experience
```bash
npm run dev
```
- Backend launches on `http://localhost:4000`.
- Frontend dashboard runs on `http://localhost:5173`.
- Seeing `Cannot GET /` in the browser at `:4000` is expected—the UI lives on the Vite dev server (`:5173`). Keep your dashboard tab pointed there.

## 4. Prepare the automation browser
When Playwright opens Chromium the first time:
- Sign into your HEB.com account manually.
- Choose your preferred store / delivery method.
- Keep the browser window visible so you can observe each step.
- The backend now pre-launches the browser as soon as you run `npm run dev`, so take your time to finish sign-in before you press **Start Shopping** in the dashboard.

## 5. Run a shopping session
1. Paste or type your grocery list (any format) into the dashboard.
2. Press **Start Shopping**.
3. Watch the live status updates and logs as items are searched and added to the cart.
4. Use **Cancel Run** anytime to regain manual control.

## 6. Linting and builds (optional)
- `npm run lint` (workspace-aware via scripts).
- `npm run build` to compile shared types, backend, and frontend bundles.

## Notes
- The parser understands section headers (e.g. `[Produce]`), quantities (`1/2 cup`), and inline notes (`(finely chopped)`).
- Product selection currently picks the first viable search result—tweak `backend/src/hebAutomation.ts` to refine heuristics as needed.
- The backend now runs Playwright Extra with a lightweight stealth shim (masking browser fingerprints) to soften bot detection, but HEB can still challenge or block automation—respect their policies and be ready to intervene manually.
