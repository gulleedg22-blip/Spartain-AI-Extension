# Roadmap: open work

The Spartan AI Chrome side panel has a working chat. The pieces below are open for contributors. Each has a GitHub issue; comment `@claude` on the issue to have Claude draft the change.

The AI backend is a **local model** (Ollama) by default, or the Anthropic API with a key each user enters in Settings. No key is ever stored in the repo.

| # | Component | Where | Contract |
|---|---|---|---|
| done | Provider, persistence, page context, tab events | `src/ai/provider.js`, `src/sidepanel/storage.js`, `src/sidepanel/page-context.js`, `src/background/service-worker.js` | Shipped in v0.2.0 |
| done | Schedule view, page tools, update banner, release zip | `src/tools/schedule.js`, `src/update/check.js`, `.github/workflows/release.yml` | Shipped in v0.4.0 |
| done | UI redesign: now bar, Markdown replies, Copy/Stop/Retry, context chip, Test connection, accessible tabs, dark-mode contrast | `src/sidepanel/*`, `src/shared/theme.css` | Shipped in v0.5.0 |
| 5c | Official day types after October 2026 | `src/data/school-calendar-2026-27.json` | `dayTypesProjected` (from a student calendar) covers November 2 to May 12. As the school publishes each month, move those dates into `dayTypesObserved` and correct any that differ. May 13 to 21 has no entries yet |
| 7 | Chrome Web Store publishing | `.github/workflows/release.yml` | Add a publish step using the store API once credentials exist as repo secrets; enables real auto-update |
| 5b | Student profile | `src/data/profile.example.json` + `storage.js` | Let the user enter classes per period; the example file is the shape. Real profiles stay in `chrome.storage`, never in the repo |
| 6 | Streaming replies | `src/ai/provider.js` + `sidepanel.js` | Optional `onToken` callback; keep the `Promise<string>` return |
| 8 | Web Store packaging | `scripts/zip.mjs`, listing assets | Screenshots, promo tile, privacy text |
| 9 | Automated UI tests in CI | new `tests/` + `.github/workflows/ci.yml` | Playwright loads the unpacked extension and checks chat, tabs, schedule states and an axe accessibility audit. Today these run by hand before a release |
| 10 | Per-student class names in the schedule | `src/tools/schedule.js` + Settings | Let a student name their periods (P1 = AP Physics) so the now bar shows the class, not the period number. Store in `chrome.storage` only |

Rules that apply to all of them are in [AGENTS.md](../AGENTS.md). Anything that calls `localhost` needs a `host_permissions` entry in `manifest.json`, justified in the PR.
