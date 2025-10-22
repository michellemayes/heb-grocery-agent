# Changelog

All notable changes to HEB Grocery Agent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- **1.0.0** (2025-10-21) - Initial release

[1.0.0]: https://github.com/michellemayes/heb-grocery-agent/releases/tag/v1.0.0

