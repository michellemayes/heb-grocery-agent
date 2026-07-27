# HEB Grocery Agent - Chrome Extension

A Chrome extension that automates your HEB grocery shopping. Simply paste your grocery list, and the extension will search for items and add them to your cart on HEB.com.

## Features

- 📝 **Free-form list parsing** - Supports section headers (e.g., `[Produce]`), quantities (`1/2 cup`, `2 lbs`), and notes (`(finely chopped)`)
- ✨ **Smart list cleanup** - AI-powered or string-based typo fixing, name standardization, and duplicate removal
  - 🤖 **AI Options**: Groq (free), OpenAI (GPT-4), or Anthropic (Claude)
  - 🔤 **String Matching**: Works without AI using a 1000+ item grocery database
  - 👀 **Preview Changes**: See before/after diff before applying
- 🛒 **Automated shopping** - Searches for items and adds them to your cart automatically
- 📊 **Real-time progress** - Watch the extension work with live status updates
- 📱 **Side Panel UI** - Resizable panel that stays open while you shop
- 🎯 **Easy to use** - Modern interface with one-click shopping

## Installation

### Prerequisites

- Node.js 18+ and npm
- Google Chrome browser
- An HEB.com account

### Build the Extension

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd heb-grocery-agent
   npm install
   ```

2. **Build the extension:**

   ```bash
   npm run build
   ```

   This will create a `extension/dist` folder with the compiled extension.

3. **Load the extension in Chrome:**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder
   - The HEB Grocery Agent extension should now appear in your extensions list

## Usage

1. **Open the extension:**
   - Navigate to https://www.heb.com and sign in
   - Click the HEB Grocery Agent icon in your Chrome toolbar
   - The side panel will open on the right side
   - **Tip:** Drag the left edge to resize the panel

2. **Set up Smart Cleanup (Optional):**
   - Click the ⚙️ settings icon
   - Enable "Smart Cleanup"
   - Choose an AI provider:
     - **Groq** (recommended) - Free tier, super fast
     - **OpenAI** - Requires paid account
     - **Anthropic** - Requires paid account
     - **None** - Uses string matching (offline)
   - Enter your API key if using AI
   - Save settings

3. **Prepare your shopping list:**
   - Paste or type your grocery list in the text area
   - The extension supports various formats:

   ```
   [Produce]
   1 large Sweet Onion (finely chopped)
   2 cups Carrots (shredded)
   
   [Dairy]
   1 cup Milk
   2 lbs Butter
   
   [Other]
   Eggs
   Bread
   ```

4. **Clean your list (Optional but Recommended):**
   - Click the ✨ "Clean List" button (magic wand icon)
   - Review the preview showing:
     - ✅ Fixed typos (e.g., "bnanana" → "banana")
     - 📝 Standardized names (e.g., "Roma Tomatoes" → "tomatoes")
     - ❌ Removed duplicates
   - Click "Apply Changes" to update your list
   - See [CLEANUP_FEATURES.md](CLEANUP_FEATURES.md) for full details

5. **Start shopping:**
   - Click "Start Shopping" in the side panel
   - The extension will navigate through HEB.com, search for each item, and add them to your cart
   - Watch the progress in real-time through the side panel
   - The panel stays open so you can monitor progress
   - You can cancel the run at any time by clicking "Cancel"

6. **Review and checkout:**
   - Once the shopping run completes, review your cart on HEB.com
   - Remove any incorrect items or adjust quantities
   - Proceed to checkout as normal

## Development

### Project Structure

```
extension/
├── manifest.json          # Chrome extension manifest
├── popup.html            # Extension popup UI
├── popup.css             # Popup styles
├── src/
│   ├── popup.ts          # Popup logic
│   ├── background.ts     # Service worker (coordinates shopping)
│   ├── content-script.ts # Interacts with HEB.com pages
│   ├── listParser.ts     # Parses grocery lists
│   └── types.ts          # TypeScript types
└── icons/                # Extension icons
```

### Development Commands

- `npm run dev` - Build and watch for changes
- `npm run build` - Build the extension for production
- `npm run clean` - Clean build artifacts

### How It Works

1. **List Parsing**: The extension parses your free-form grocery list into structured items with names, quantities, units, and notes
2. **Smart Cleanup** (Optional): 
   - Uses AI (Groq/OpenAI/Anthropic) or string-similarity matching
   - Fixes typos against a 1000+ item grocery database
   - Standardizes names and removes duplicates
   - Shows preview before applying changes
3. **Background Coordination**: A service worker manages the shopping state and coordinates between the side panel and content script
4. **Content Script**: Injected into HEB.com pages, it performs the actual automation:
   - Searches for each item
   - Finds product cards on search results
   - Clicks "Add to Cart" buttons
5. **Real-time Updates**: Progress is communicated back to the side panel for live status display
6. **Side Panel**: Resizable panel stays open while you shop, providing easy monitoring and control

## List Format

The parser is flexible and supports multiple formats:

### Section Headers
```
[Produce]
[Dairy]
[Canned Goods & Soups]
```

### Quantities and Units
```
1 cup Milk
2 lbs Chicken
1/2 cup Butter
1 1/2 cups Sugar
```

Supported units: cup, tsp, tbsp, oz, lb, g, kg, bag, can, pkg, bottle, count

### Bullets and Numbering
```
- Eggs
* Bread
• Cheese
1. Milk
2. Butter
```

### Notes
```
1 large Sweet Onion (finely chopped)
Chicken (rotisserie)
```

## Smart Cleanup Features

The extension includes intelligent list cleanup with multiple options:

### String Matching (No API Required)
- Works completely offline
- Uses fuzzy matching against 1000+ common grocery items
- 70% similarity threshold for typo detection
- Free and fast

### AI-Powered (Optional)
- **Groq** (Recommended): Free tier, super fast, uses Llama 3.3
  - Get API key: https://console.groq.com/
- **OpenAI**: Uses GPT-4o-mini
  - Requires paid account with billing
- **Anthropic**: Uses Claude
  - Requires paid account

All methods show a preview before applying changes. See [CLEANUP_FEATURES.md](CLEANUP_FEATURES.md) for full documentation.

## Limitations

- **Product selection**: The extension currently selects the first available search result. You may need to adjust items in your cart.
- **Bot detection**: HEB.com may occasionally challenge automated sessions. The extension works directly in your browser, so it's less likely to be blocked than headless automation.
- **Manual setup required**: You must be signed in and have your store/preferences set before running the extension.
- **Error handling**: Unexpected modals (age verification, substitutions) may cause the automation to fail. Check the logs and manually intervene if needed.

## Troubleshooting

**Extension doesn't load:**
- Make sure you built the extension (`npm run build`)
- Check that you're loading the `extension/dist` folder, not the `extension` folder
- Ensure icons are present in `extension/dist/icons/`

**Side panel doesn't open:**
- Click the extension icon in your toolbar
- Make sure you've reloaded the extension after building
- Check Chrome's developer console for errors

**AI cleanup not working:**
- Verify your API key is correct and has the right format:
  - Groq: `gsk_...`
  - OpenAI: `sk-...` or `sk-proj-...`
  - Anthropic: `sk-ant-...`
- Groq free tier is recommended for most users
- OpenAI requires prepaid credits or billing setup
- String matching works offline if AI fails
- **Note:** AI cleanup only runs when you click **Clean List** — it improves the
  list before shopping, it does not run automatically during a shopping run.
- After updating the extension, fully reload it from `chrome://extensions/` so
  the new permissions (needed to reach the AI providers) take effect.

**Extension stuck or won't start a new run:**
- Click the **Reset** button in the side panel. It clears the agent's state and
  is always available, even if a previous run got stuck (e.g. the HEB tab was
  closed mid-run). You should no longer need to remove and re-install the
  extension to recover.

**Shopping doesn't start:**
- Make sure you're on HEB.com when you click "Start Shopping"
- Check that you're signed in to your HEB account
- Look at the logs in the side panel for error messages

**Items aren't being added:**
- HEB.com's page structure may have changed
- Check the browser console (F12) for errors
- The extension may need updates to match new selectors

**Extension is too fast/slow:**
- Adjust the delay values in `content-script.ts` if needed
- The default includes small delays between items to avoid overwhelming the site

## Privacy & Terms

- This extension operates entirely in your browser
- All data is stored locally on your device
- API keys (if used) are only sent to your chosen AI provider
- No tracking, analytics, or data collection
- See [PRIVACY.md](PRIVACY.md) for full privacy policy
- Use responsibly and in accordance with HEB's Terms of Service
- The extension is provided as-is with no warranties

## License

MIT

---

**Note**: This is a personal automation tool. HEB may update their website at any time, which could break the extension. Use at your own discretion and always review your cart before checkout.
