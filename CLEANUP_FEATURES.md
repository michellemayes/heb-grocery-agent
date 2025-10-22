# Smart List Cleanup Features

## Overview

The HEB Grocery Agent now includes intelligent list cleanup features that can fix typos, standardize item names, and remove duplicates from your shopping lists.

## Features

### 1. String Matching (Default - No API Required)
- Fixes common typos using fuzzy string matching
- Compares against a database of ~1000 common grocery items
- Works offline and requires no configuration
- 70% similarity threshold ensures accurate corrections

### 2. AI-Powered Cleanup (Optional)
- Supports OpenAI (GPT-4) and Anthropic (Claude)
- More intelligent cleanup and standardization
- Requires API key (stored locally)
- Automatically falls back to string matching if AI fails

### 3. Preview Before Applying
- See all changes before they're applied
- Color-coded diff view:
  - 🟡 Yellow: Fixed typos
  - 🔵 Blue: Standardized names
  - 🔴 Red: Removed duplicates
  - ⚪ Gray: Unchanged items
- Summary statistics
- Cancel or apply changes

## How to Use

### Basic Usage (No Setup Required)

1. Paste or type your grocery list in the text area
2. Click the **"Clean List"** button
3. Review the preview modal showing all changes
4. Click **"Apply Changes"** to update your list
5. Click **"Start Shopping"** to proceed as normal

### With AI (Optional)

1. Click the **⚙️ Settings** icon
2. Check **"Enable Smart Cleanup"**
3. Select your AI provider:
   - **None** - Uses string matching only
   - **Groq** - Uses Llama 3.3 (fast, often has free tier) ⭐ **Recommended**
   - **OpenAI** - Uses GPT-4 (requires paid account)
   - **Anthropic** - Uses Claude (requires paid account)
4. Enter your API key (if using AI)
5. Click **"Save Settings"**
6. Now when you click **"Clean List"**, it will use AI

### Example

**Original List:**
```
bnanana
Brocoli
tomatos
Milk
milk
chicken brest
```

**After Cleanup:**
```
banana
broccoli
tomatoes
milk
chicken breast
```

**Changes Detected:**
- Fixed: "bnanana" → "banana"
- Fixed: "Brocoli" → "broccoli"
- Fixed: "tomatos" → "tomatoes"
- Removed: "Milk" (duplicate of "milk")
- Fixed: "chicken brest" → "chicken breast"

## API Keys

### Getting a Groq API Key (Recommended - Free Tier Available) ⭐

1. Go to https://console.groq.com/
2. Sign up or log in (free account available)
3. Navigate to API Keys
4. Create a new API key
5. Copy and paste into the extension settings

**Why Groq?**
- ✅ Free tier available (no credit card required initially)
- ✅ Super fast inference (often 10x faster than others)
- ✅ Uses excellent open-source models (Llama 3.3)
- ✅ Great for this use case

### Getting an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. **Add billing/payment method** (required)
4. Create a new API key
5. Copy and paste into the extension settings

**Note:** OpenAI requires prepaid credits or a payment method before API access.

### Getting an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy and paste into the extension settings

## Privacy & Security

- API keys are stored **locally** in your browser
- Keys are **never sent** anywhere except to your chosen AI provider
- String matching works **completely offline**
- No data is sent to any third-party servers (except AI providers when enabled)

## Tips

- **Try Groq first** - Free tier, super fast, no billing required! ⭐
- The string matching feature works great for most use cases
- Enable AI for more intelligent standardization and complex lists
- Always review the preview before applying changes
- The extension will fall back to string matching if AI fails
- You can always undo by pasting your original list again

## Troubleshooting

**"AI cleanup failed" error:**
- Verify your API key is correct
- Check that you have credits/quota remaining with your AI provider
- The extension will automatically fall back to string matching

**Incorrect corrections:**
- The string matching uses a 70% similarity threshold
- Some uncommon items may not match correctly
- You can manually fix any incorrect suggestions before applying

**No changes detected:**
- Your list may already be clean!
- Try adding some intentional typos to test the feature

