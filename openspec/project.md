# Project Context

## Purpose
HEB Grocery Agent is a Chrome extension that automates grocery shopping on HEB.com. It provides intelligent list cleanup using both string similarity matching and AI-powered processing, then automates the shopping process by parsing grocery lists and adding items to the HEB cart automatically.

## Tech Stack
- **Frontend**: TypeScript, HTML5, CSS3, Chrome Extension APIs (Manifest V3)
- **Build Tools**: Node 22, esbuild (`extension/scripts/build.mjs`), npm workspaces
- **Testing**: Vitest unit tests for the pure modules (`src/*.test.ts`), GitHub Actions CI
- **Libraries**: none at runtime; fuzzy matching lives in `src/similarity.ts`
- **AI Integration**: OpenAI API, Anthropic API, Groq API (optional)
- **Styling**: Custom CSS with HEB brand colors (#e1251b primary)
- **Architecture**: Chrome Extension with background service worker, content script, and side panel UI

## Project Conventions

### Code Style
- **TypeScript**: Strict typing, interfaces for all data structures
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **File Structure**: Separate files for different concerns (types.ts, aiCleaner.ts, listCleaner.ts)
- **Comments**: JSDoc comments for all public functions
- **Formatting**: Consistent indentation, meaningful variable names
- **Error Handling**: Comprehensive try-catch blocks with user-friendly error messages

### Architecture Patterns
- **Separation of Concerns**: Clear separation between UI (popup.ts), business logic (listCleaner.ts, aiCleaner.ts), and types (types.ts)
- **Chrome Extension MV3**: Background service worker owns run state and drives navigation; the content script is stateless and handles one item per page; side panel UI
- **Modular Design**: Each feature (AI cleanup, string matching, automation) in separate modules
- **Configuration Management**: Settings stored in chrome.storage.local
- **Event-Driven**: UI events trigger appropriate business logic functions

### Testing Strategy
- **Unit Tests**: `npm run check` runs typecheck, Vitest and a build; keep DOM-free logic in pure modules so it can be tested
- **Manual Testing**: Comprehensive testing on HEB.com with various list formats
- **Error Scenarios**: Testing with invalid API keys, network failures, empty lists
- **Cross-Browser**: Primary focus on Chrome, compatibility with other Chromium browsers
- **Performance Testing**: Testing with lists of various sizes (5-50 items)
- **User Experience**: Auto-scroll, visual feedback, responsive design testing

### Git Workflow
- **Branching**: Feature branches for new functionality (e.g., list-intelligence)
- **Commits**: Descriptive commit messages with clear feature descriptions
- **Versioning**: Semantic versioning; the version lives in `extension/package.json` only (see RELEASING.md)
- **Documentation**: README updates for each major feature addition

## Domain Context
- **HEB.com**: Texas-based grocery chain website with specific DOM structure and shopping flow
- **Grocery Lists**: Users typically have categorized lists with quantities, brands, and notes
- **Shopping Automation**: Must handle various product search scenarios, out-of-stock items, and user preferences
- **Chrome Extensions**: Manifest V3 requirements, side panel permissions, content script injection
- **AI Integration**: Multiple provider support (OpenAI, Anthropic, Groq) with fallback to string matching

## Important Constraints
- **Chrome Web Store Compliance**: No remote code execution, proper permissions, privacy policy required
- **HEB Terms of Service**: Must comply with HEB's website terms, no scraping or abuse
- **API Rate Limits**: Respect AI provider rate limits and implement proper error handling
- **User Privacy**: API keys stored locally, no data sent without user consent
- **Performance**: Automation must be fast but not overwhelming to HEB's servers
- **Accessibility**: Side panel must be resizable and responsive

## External Dependencies
- **HEB.com**: Primary target website for automation
- **AI Providers**: 
  - OpenAI API (gpt-5-mini)
  - Anthropic API (claude-opus-5-5)
  - Groq API (llama-3.3-70b-versatile)
- **Chrome APIs**: chrome.tabs, chrome.storage, chrome.action, chrome.sidePanel
- **Build Dependencies**: esbuild, TypeScript, Vitest
