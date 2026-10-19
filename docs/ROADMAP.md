# Roadmap: open work

The Spartan AI Chrome side panel has a working chat. The pieces below are open for contributors. Each has a GitHub issue; comment `@claude` on the issue to have Claude draft the change.

The AI backend is a **local model** (Ollama) by default, or the Anthropic API with a key each user enters in Settings. No key is ever stored in the repo.

| # | Component | Where | Contract |
|---|---|---|---|
| done | Provider, persistence, page context, tab events | `src/ai/provider.js`, `src/sidepanel/storage.js`, `src/sidepanel/page-context.js`, `src/background/service-worker.js` | Shipped in v0.2.0 |
| 5 | Tools tab features | `src/sidepanel/index.html` + new modules | Study guide, flashcards, citation helper (layout placeholders exist) |
| done | Schedule view, page tools, update banner, release zip | `src/tools/schedule.js`, `src/update/check.js`, `.github/workflows/release.yml` | Shipped in v0.4.0 |
| 5c | Day types beyond October 2026 | `src/data/school-calendar-2026-27.json` | Add `dayTypesObserved` entries from each month's school calendar so Wednesday variants (Late Start, Mass, Rally) are known in advance |
| 7 | Chrome Web Store publishing | `.github/workflows/release.yml` | Add a publish step using the store API once credentials exist as repo secrets; enables real auto-update |
| 5b | Student profile | `src/data/profile.example.json` + `storage.js` | Let the user enter classes per period; the example file is the shape. Real profiles stay in `chrome.storage`, never in the repo |
| 6 | Streaming replies | `src/ai/provider.js` + `sidepanel.js` | Optional `onToken` callback; keep the `Promise<string>` return |
| 7 | Web Store packaging | `scripts/zip.mjs`, listing assets | Screenshots, promo tile, privacy text |

Rules that apply to all of them are in [AGENTS.md](../AGENTS.md). Anything that calls `localhost` needs a `host_permissions` entry in `manifest.json`, justified in the PR.
