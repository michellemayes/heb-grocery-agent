# Privacy Policy for HEB Grocery Agent

**Last Updated:** September 30, 2026

## Overview

HEB Grocery Agent is a Chrome extension that helps automate your HEB.com grocery shopping. This privacy policy explains how the extension handles your data.

## Data Collection

**We do NOT collect, store, or transmit any personal data to our servers.** The extension operates entirely within your browser.

## Data Storage (Local Only)

The following data is stored **locally on your device** using Chrome's storage API:

- Your shopping lists (text input)
- Extension settings (HEB brand preference, cleanup settings)
- AI provider selection (None, Groq, OpenAI, or Anthropic)
- API keys (if you choose to use AI features)
- Shopping session state (temporary, cleared after completion)

**This data never leaves your device** except as described below.

## API Keys and External Services

### If You Enable AI Features:

When you choose to use AI-powered list cleanup, you must provide an API key from one of these providers:

- **Groq** (https://groq.com)
- **OpenAI** (https://openai.com)
- **Anthropic** (https://anthropic.com)

**Your API key is:**
- Stored locally in your browser
- Only sent directly to your chosen AI provider
- Never transmitted to us or any third party
- Used only to process your grocery list text

**What gets sent to AI providers:**
- Only the text of your grocery list
- No personal information, browsing history, or other data

### Without AI Features:

If you don't enable AI features, the extension uses local string-matching algorithms and no external API calls are made.

## HEB.com Interaction

The extension interacts with HEB.com to:
- Search for grocery items
- Add items to your cart
- Navigate between pages

**This requires:**
- Your existing HEB.com login session
- Access to HEB.com pages while you're using the extension

The extension does not:
- Store your HEB.com credentials
- Access your payment information
- Track your browsing on other websites

## Permissions Explained

The extension requests the following Chrome permissions:

- **`storage`**: To save your list, settings and API key locally
- **`sidePanel`**: To display the extension interface in a side panel
- **Host access to `www.heb.com`**: To search for items and add them to your cart
- **Host access to `api.groq.com`, `api.openai.com`, `api.anthropic.com`**: To send your list to the AI provider you chose, only when you click Clean List with AI turned on

## Third-Party Services

### AI Providers (Optional):
If you enable AI features, your grocery list text is sent to your chosen provider:
- **Groq**: See https://groq.com/privacy
- **OpenAI**: See https://openai.com/privacy
- **Anthropic**: See https://anthropic.com/privacy

### No Analytics or Tracking:
We do not use:
- Google Analytics
- Usage tracking
- Crash reporting
- Any telemetry services

## Data Security

- API keys are kept in Chrome's extension storage (`chrome.storage.local`), which only this extension can read. They are not encrypted at rest, so anyone with access to your Chrome profile could read them.
- All AI provider API calls use HTTPS
- No server-side data storage (we don't have servers)

## Your Rights

You have complete control over your data:

- **View**: Open Chrome DevTools → Application → Storage to see stored data
- **Export**: Copy your settings manually if needed
- **Delete**: Uninstall the extension to remove all local data
- **Clear**: Delete the key in Settings and save to remove it

## Children's Privacy

This extension is not directed at children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy. Changes will be reflected in the "Last Updated" date above. Continued use of the extension constitutes acceptance of changes.

## Open Source

This extension is open source. You can review the code at:
https://github.com/michellemayes/heb-grocery-agent

## Contact

For privacy concerns or questions:
- GitHub Issues: https://github.com/michellemayes/heb-grocery-agent/issues
