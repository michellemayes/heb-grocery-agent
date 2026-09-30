# HEB Grocery Agent

A Chrome extension that takes a free-form grocery list and adds each item to your HEB.com cart. It searches for each item, picks the result whose name best matches, and clicks "Add to cart". You review the cart and check out yourself.

## Install from source

Requires Node.js 22+ and Chrome 116+.

```bash
git clone https://github.com/michellemayes/heb-grocery-agent.git
cd heb-grocery-agent
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `extension/dist` folder.

After pulling new changes, run `npm run build` again and click the reload icon on the extension's card.

## Use it

1. Sign in on heb.com and pick your store.
2. Click the extension icon to open the side panel.
3. Paste your list and click **Start Shopping**.

The agent reuses an open heb.com tab (or opens one) and works through the list. Each item shows its status in the panel. Items that couldn't be added are marked with the reason, so you can add them by hand. Your list is kept between sessions.

- **Cancel** stops after the current step.
- **Reset** clears the items and log. Use it if anything looks stuck. Starting a new run also replaces any previous one.
- Closing the heb.com tab stops the run.

### List format

Most formats work. Section headers, quantities, bullets and notes are all understood:

```
[Produce]
1 large Sweet Onion (finely chopped)
2 cups Carrots

[Dairy]
- Milk
1/2 cup Butter
```

Before searching, each item is reduced to a search term: `One head of kale, chard, or collards` searches for `kale`, `Chicken or Veg Broth` for `Chicken Broth`, and `2 cloves garlic (minced)` for `garlic`.

Units understood: cup, tsp, tbsp, oz, lb, g, kg, bag, can, pkg, bottle, count and their plurals.

### Clean List

**Clean List** suggests fixes (typos, duplicates, inconsistent names) and shows a before/after preview. Nothing changes until you click **Apply Changes**.

By default it matches items against a built-in list of about 1,000 groceries, which works offline. To use an AI model instead, open Settings, turn on **Use AI for Clean List**, pick a provider and paste an API key:

| Provider  | Model                     | Get a key                               |
| --------- | ------------------------- | --------------------------------------- |
| Groq      | `llama-3.3-70b-versatile` | https://console.groq.com (free tier)    |
| OpenAI    | `gpt-5-mini`              | https://platform.openai.com/api-keys    |
| Anthropic | `claude-opus-5-5`         | https://console.anthropic.com           |

If the AI request fails, Clean List falls back to string matching and tells you why.

## Limitations

- The agent adds one of each item. It does not set quantities in the cart.
- It relies on heb.com's page structure. If HEB changes its markup, items will start failing with "Timed out waiting for search results" or "No Add to cart button" until the selectors in `extension/src/content-script.ts` are updated.
- Age checks, substitution prompts and other pop-ups are not handled.
- The "HEB brand only" option relies on a heb.com search filter that may change.

## Troubleshooting

**Every item fails.** Make sure you're signed in on heb.com, then reload the heb.com tab and try again. If it keeps failing, HEB's page layout has probably changed; please open an issue.

**The side panel doesn't open.** Reload the extension from `chrome://extensions`. Make sure you loaded `extension/dist`, not `extension`.

**AI cleanup fails.** Check that the key belongs to the provider you selected and that the account has credit. The error message includes the provider's own reason.

## Development

```bash
npm run dev        # rebuild on change
npm run check      # typecheck, unit tests and a build (what CI runs)
npm run package    # build and zip into release/ for the Chrome Web Store
```

```
extension/
├── manifest.json        # MV3 manifest (version comes from extension/package.json)
├── popup.html/.css      # side panel UI
├── scripts/             # build and packaging scripts
└── src/
    ├── background.ts     # service worker: runs the shopping loop, owns all state
    ├── content-script.ts # on heb.com: finds the best result and clicks Add to cart
    ├── popup.ts          # side panel
    ├── searchQuery.ts    # list item -> search term, result scoring
    ├── listParser.ts     # free-form list -> structured items
    ├── listCleaner.ts    # offline Clean List
    ├── aiCleaner.ts      # AI Clean List
    └── *.test.ts         # unit tests (Vitest)
```

The background worker navigates the heb.com tab to each search page, waits for it to load, then asks the content script to add the best match. The content script keeps no state, so page reloads can't leave a run half-finished. Each step has a timeout, and every run has an ID so a cancelled or replaced run stops itself.

Releasing a new version to the Chrome Web Store is covered in [RELEASING.md](RELEASING.md).

## Privacy

Everything stays in your browser. Your list is sent only to heb.com (as searches) and, if you turn on AI cleanup, to the provider you chose. See [PRIVACY.md](PRIVACY.md).

This is a personal automation tool, not affiliated with H-E-B. Use it in line with HEB's terms of service and always review your cart before checkout.

## License

MIT
