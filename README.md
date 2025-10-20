# HEB Grocery Agent - Chrome Extension

A Chrome extension that automates your HEB grocery shopping. Simply paste your grocery list, and the extension will search for items and add them to your cart on HEB.com.

## Features

- 📝 **Free-form list parsing** - Supports section headers (e.g., `[Produce]`), quantities (`1/2 cup`, `2 lbs`), and notes (`(finely chopped)`)
- 🛒 **Automated shopping** - Searches for items and adds them to your cart automatically
- 📊 **Real-time progress** - Watch the extension work with live status updates
- 🎯 **Easy to use** - Clean popup interface with one-click shopping

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

1. **Open HEB.com:**
   - Navigate to https://www.heb.com
   - Sign in to your account
   - Set your preferred store and delivery/pickup options

2. **Prepare your shopping list:**
   - Click the extension icon in your Chrome toolbar
   - Paste or type your grocery list in the popup
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

3. **Start shopping:**
   - Click "Start Shopping" in the popup
   - The extension will navigate through HEB.com, search for each item, and add them to your cart
   - Watch the progress in real-time through the popup interface
   - You can cancel the run at any time by clicking "Cancel"

4. **Review and checkout:**
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
2. **Background Coordination**: A service worker manages the shopping state and coordinates between the popup and content script
3. **Content Script**: Injected into HEB.com pages, it performs the actual automation:
   - Searches for each item
   - Finds product cards on search results
   - Clicks "Add to Cart" buttons
4. **Real-time Updates**: Progress is communicated back to the popup for live status display

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

**Shopping doesn't start:**
- Make sure you're on HEB.com when you click "Start Shopping"
- Check that you're signed in to your HEB account
- Look at the logs in the popup for error messages

**Items aren't being added:**
- HEB.com's page structure may have changed
- Check the browser console (F12) for errors
- The extension may need updates to match new selectors

**Extension is too fast/slow:**
- Adjust the delay values in `content-script.ts` if needed
- The default includes small delays between items to avoid overwhelming the site

## Privacy & Terms

- This extension operates entirely in your browser and doesn't send data to any external servers
- All shopping is performed using your own HEB.com session
- Use this extension responsibly and in accordance with HEB's Terms of Service
- The extension is provided as-is with no warranties

## License

MIT

---

**Note**: This is a personal automation tool. HEB may update their website at any time, which could break the extension. Use at your own discretion and always review your cart before checkout.
