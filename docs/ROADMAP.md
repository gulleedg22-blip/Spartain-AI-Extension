# Roadmap: open work

This repo is the **UI framework** for the Spartain AI Chrome side panel. The pieces below are intentionally unbuilt so contributors can pick them up. Each has a GitHub issue; comment `@claude` on the issue to have Claude draft the change.

The AI backend is a **local model** running on the user's machine (for example an HTTP server on `localhost`). It is **not** the Anthropic API and not any hosted API.

| # | Component | Where | Contract |
|---|---|---|---|
| 1 | Local model provider | `src/ai/provider.js` | `generate({ messages, context, settings, signal }) -> Promise<string>` |
| 2 | Persistence | `src/sidepanel/storage.js` | `loadSettings / saveSettings / loadHistory / saveHistory / clearHistory` on `chrome.storage.local` |
| 3 | Page context | `src/sidepanel/page-context.js` + `src/content/content.js` | `getPageContext() -> { title, url, selection }` |
| 4 | Tab change events | `src/background/service-worker.js` | Send `MSG.TAB_CHANGED` to the panel on `chrome.tabs.onActivated` / `onUpdated` |
| 5 | Tools tab features | `src/sidepanel/index.html` + new modules | Study guide, flashcards, citation helper (layout placeholders exist) |
| 6 | Streaming replies | `src/ai/provider.js` + `sidepanel.js` | Optional `onToken` callback; keep the `Promise<string>` return |
| 7 | Web Store packaging | `scripts/zip.mjs`, listing assets | Screenshots, promo tile, privacy text |

Rules that apply to all of them are in [AGENTS.md](../AGENTS.md). Anything that calls `localhost` needs a `host_permissions` entry in `manifest.json`, justified in the PR.
