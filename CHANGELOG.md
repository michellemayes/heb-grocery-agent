# Changelog

All notable changes to HEB Grocery Agent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-30

### Added
- **Choose the AI model for Clean List.** Settings now has a model picker per
  provider, defaulting to the cheapest option: Groq `llama-3.1-8b-instant`,
  OpenAI `gpt-5-nano`, Anthropic `claude-haiku-4-5`. The previous models are
  still available in the list.

### Fixed
- **Runs no longer double-add, stall or leak into each other.** The background
  worker now drives the whole run and the content script only handles one item
  per page. Previously the content script kept its own copy of the run in
  storage, so a second heb.com tab or a re-injected script could process the
  same list twice.
- Closing the heb.com tab stops the run immediately instead of failing each
  remaining item.
- Cancelling or starting a new run can no longer write stale results into the
  new run.
- Page loads and "Add to cart" now time out instead of waiting forever.
- If Chrome restarts the service worker mid-run, the panel says the run was
  interrupted instead of showing it as running.
- Items whose "Add to cart" button is disabled (out of stock) are reported as
  unavailable instead of "added".
- String-matching cleanup now catches duplicates hidden by a typo
  (`bnananas` and `bananas`).
- "Clear" in the log now actually clears it; before, the log came back on the
  next update.

### Changed
- AI cleanup models updated: OpenAI `gpt-5-mini`, Anthropic `claude-opus-5-5`,
  Groq `llama-3.3-70b-versatile`. The retired fallback models were removed.
  Requests time out after 60 seconds, and error messages name the cause
  (bad key, rate limit, etc.).
- Your list is saved as you type and restored when the panel reopens.
- Removed the `activeTab` and `scripting` permissions, which are no longer
  needed.
- Requires Chrome 116 or later.

### Development
- Node 22, esbuild 0.28, Vitest unit tests, and a GitHub Actions workflow that
  typechecks, tests and uploads the store zip for every PR.
- `npm run package` builds the Chrome Web Store zip. The version is set in
  `extension/package.json` only. See `RELEASING.md`.
- Replaced the unmaintained `string-similarity` dependency with a small
  local implementation.

## [1.0.1] - 2026-01-27

### Fixed
- **Anthropic (Claude) cleanup now works** - Added the AI provider API hosts
  (`api.anthropic.com`, `api.openai.com`, `api.groq.com`) to `host_permissions`
  and set the `anthropic-dangerous-direct-browser-access` header so requests are
  no longer blocked by CORS. Previously a configured Claude key was never
  actually used (the Anthropic dashboard showed zero usage). Network failures
  now surface a clear error instead of failing silently.
- **Agent no longer gets stuck in a "running" state** - A run that stalls (tab
  closed, page fails to load, completion never reported) is now automatically
  reclaimed by the next "Start", and a new always-available **Reset** button
  clears the agent's state without reinstalling the extension.
- **Smarter product search** - Search terms are cleaned before querying
  (`One head of kale, chard, or collards` → `kale`, `Chicken or Veg Broth`
  → `Chicken Broth`, `2 cloves garlic (minced)` → `garlic`) and the result that
  best matches the search term is chosen instead of always taking the first one
  (e.g. picks *sesame oil* over *sesame seeds*).

### Changed
- Added `sesame oil`, `sesame seeds`, and a few other cooking oils to the
  grocery database used by string-matching cleanup.

## [1.0.0] - 2025-10-21

### Added
- **Side Panel UI** - Resizable panel that stays open while shopping
- **Smart List Cleanup** - AI-powered and string-matching list optimization
  - Fix typos automatically
  - Standardize item names
  - Remove duplicates
  - Preview changes before applying
- **AI Provider Support**
  - Groq (Llama 3.3) - Free tier available
  - OpenAI (GPT-4o-mini)
  - Anthropic (Claude)
- **String-Matching Fallback** - 1000+ item grocery database for offline use
- **Auto-Scroll Progress** - List automatically scrolls to current item
- **Active Item Highlighting** - Visual indication of item being processed
- **Settings Panel** - Configure AI providers and API keys
- **Free-Form List Parser** - Supports:
  - Section headers (e.g., `[Produce]`)
  - Quantities with units (e.g., `2 cups`, `1/2 lb`)
  - Notes in parentheses (e.g., `(finely chopped)`)
  - Bullets, numbering, and plain text
- **HEB Brand Filter** - Option to search HEB brand products only
- **Real-Time Progress Tracking**
  - Status badges for each item
  - Live logs with timestamps
  - Completion statistics
- **Error Recovery** - Continues with remaining items if one fails
- **Modern Icon Set** - Professional SVG icons throughout

### Technical
- Chrome Manifest V3 compliance
- TypeScript codebase
- Modular architecture with separate modules:
  - List parser
  - String-based cleaner
  - AI cleaner with multi-provider support
  - Grocery database (1000+ items)
- Local-only data storage
- No tracking or analytics
- Open source

### Performance
- Optimized timing for 2.4x faster shopping automation
- Efficient DOM querying and element detection
- Smooth scroll animations
- Responsive UI updates

### Security & Privacy
- API keys stored locally only
- No data transmitted to third parties (except chosen AI provider)
- Encrypted local storage
- All API calls over HTTPS
- No tracking or telemetry

## [Unreleased]

### Planned
- Import/export shopping lists
- Favorite lists / templates
- Shopping history
- Custom grocery database additions
- Keyboard shortcuts
- Dark mode
- Multi-language support

---

## Version History

- **1.1.0** (2026-09-30) - Reliability rewrite of the shopping loop, updated AI models, CI and release tooling
- **1.0.1** (2026-01-27) - Bug fixes: Claude API key usage, stuck-state reset, smarter search
- **1.0.0** (2025-10-21) - Initial release

[1.1.0]: https://github.com/michellemayes/heb-grocery-agent/releases/tag/v1.1.0
[1.0.1]: https://github.com/michellemayes/heb-grocery-agent/releases/tag/v1.0.1
[1.0.0]: https://github.com/michellemayes/heb-grocery-agent/releases/tag/v1.0.0

