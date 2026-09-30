# Chrome Web Store listing

Copy for the Chrome Web Store Developer Dashboard. Keep it in sync with the extension when features or permissions change.

## Name

```
HEB Grocery Agent
```

## Summary (132 characters max)

The same text as the `description` field in `extension/manifest.json`.

```
Paste a grocery list and add every item to your HEB.com cart. Optional AI cleanup fixes typos and duplicates first.
```

## Description

```
Paste your grocery list and HEB Grocery Agent adds each item to your HEB.com cart. You review the cart and check out as usual.

HOW IT WORKS
1. Sign in on heb.com and choose your store.
2. Click the extension icon to open the side panel.
3. Paste your list and click Start Shopping.

The agent searches heb.com for each item, picks the result whose name best matches, and adds it to your cart. The side panel shows each item's progress. Anything it couldn't add is listed with the reason, so you can add it yourself.

LISTS IN ANY FORMAT
Section headers like [Produce], quantities like "2 cups" or "1/2 lb", bullets, numbering, and notes in parentheses all work. Recipe-style lines are turned into sensible searches: "Chicken or Veg Broth" searches for chicken broth, and "2 cloves garlic (minced)" searches for garlic.

CLEAN LIST
Clean List fixes typos, removes duplicates and tidies item names, and shows a preview before changing anything. It works offline using a built-in list of about 1,000 groceries. You can also use your own Groq, OpenAI or Anthropic API key for AI cleanup.

PRIVACY
Your list, settings and API key stay in your browser. Nothing is sent to the developer. Your list goes only to heb.com as searches and, if you turn on AI cleanup, to the AI provider you chose. The extension has no analytics or tracking, and the code is open source.

GOOD TO KNOW
• The agent adds one of each item. Adjust quantities in your cart.
• It depends on heb.com's page layout, so a site redesign can break it until the extension is updated.
• Not affiliated with H-E-B.
```

## Category

```
Shopping
```

## Language

```
English
```

## Privacy practices

**Single purpose**

```
Adds the items from a user-provided grocery list to the user's HEB.com cart.
```

**Permission justifications**

```
storage: Saves the user's grocery list, settings and optional AI API key locally.
sidePanel: Shows the extension's interface in Chrome's side panel while the user shops.
Host permission www.heb.com: Loads HEB search results for each list item and clicks "Add to cart".
Host permissions api.groq.com, api.openai.com, api.anthropic.com: Only when the user turns on AI cleanup and clicks Clean List, sends the list text to the provider the user chose, using the user's own API key.
```

**Data usage**

```
The extension does not collect or transmit user data to the developer. The grocery list is sent to heb.com as search queries and, only if the user enables AI cleanup, to the AI provider the user selects. No data is sold or shared.
```

## Links

- Homepage: https://github.com/michellemayes/heb-grocery-agent
- Privacy policy: https://github.com/michellemayes/heb-grocery-agent/blob/main/PRIVACY.md

## Screenshots (1280×800)

1. Side panel with a list pasted in.
2. Clean List preview showing fixes.
3. A run in progress with the active item highlighted.
4. Settings with the AI provider options.
5. A finished run with the summary.
