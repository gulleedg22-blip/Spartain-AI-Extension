# Instructions for AI coding agents

You are working on **Spartain AI**, a **Google Chrome extension using Manifest V3 whose UI is a Chrome side panel**. Treat every statement below as a hard constraint.

## What this is / is not

- It IS a Chrome extension. Entry point is `manifest.json`. Chrome loads `src/` files directly.
- Its AI backend IS a **local model** on the user's machine, reached only from `src/ai/provider.js`. It is NOT the Anthropic API and NOT a hosted API. Do not add `@anthropic-ai/sdk`, `openai`, or any cloud model client.
- The repo is currently the **UI framework only**. `src/ai/provider.js`, `src/sidepanel/storage.js`, `src/sidepanel/page-context.js`, and `src/content/content.js` are stubs with contracts in their header comments. Implement the contract; do not change its signature without saying so.
- It is NOT a website, SPA, Node service, or Electron app. Do not add Express, Vite, Webpack, React, Vue, Tailwind, or TypeScript.
- There is no build step and no `dist/` to edit. `npm run zip` only packages files for the Web Store.

## Where things go

| Need | File |
|---|---|
| Permissions, icons, entry points | `manifest.json` |
| UI markup | `src/sidepanel/index.html` |
| UI logic | `src/sidepanel/sidepanel.js` |
| UI styles | `src/sidepanel/sidepanel.css` |
| Colors, spacing, fonts | `src/shared/theme.css` (the ONLY place hex colors may appear) |
| Message type names, storage keys | `src/shared/messages.js` |
| Tab events, panel opening | `src/background/service-worker.js` |
| Reading the current web page | `src/content/content.js` (stub) + `src/sidepanel/page-context.js` (stub) |
| Model call | `src/ai/provider.js` (stub) |
| Persistence | `src/sidepanel/storage.js` (stub) |
| Open work list | `docs/ROADMAP.md` |

## Rules

1. Brand: green `#076124` on white. Use the `--sp-*` CSS variables; never write a new hex color outside `theme.css`.
2. The background script is a **service worker**: no `document`, no `window`, no `localStorage`, no long-lived state. Use `chrome.storage`.
3. The content script is a **classic script**: no `import`/`export`. Keep it read-only.
4. Side panel and background scripts are ES modules and import from `src/shared/messages.js`.
5. Add a message type to `MSG` in `messages.js` before sending it.
6. Every new `permissions` / `host_permissions` entry must be justified in the PR description. Prefer `activeTab` over broad host permissions.
7. Never embed API keys or tokens. The local model needs none. Calling `localhost` requires a justified `host_permissions` entry.
8. Chrome APIs return Promises in MV3; use `await`, not callbacks. Wrap `chrome.tabs.sendMessage` in try/catch (the receiver may not exist).
9. Keep changes small and in scope. Do not refactor unrelated files.
10. Before finishing: run `npm run check`. If you changed UI, describe how to verify it in `chrome://extensions` > Load unpacked.

## UI changes

Before touching `src/sidepanel/` or `src/shared/theme.css`, read `.claude/skills/sidepanel-ui/SKILL.md`. It explains the design language, the reusable classes, how to add a tab or a section without new JS, and how to screenshot the real extension in headless Chromium:

```bash
node .claude/skills/sidepanel-ui/scripts/screenshot.mjs --out /tmp/shots --tab settings --dark
```

## Testing a change

There are no automated UI tests yet. Verify by loading the unpacked extension (`chrome://extensions` > Developer mode > Load unpacked > repo root), opening the side panel, and exercising the change. Check the service worker console via the "service worker" link on the extension card.

## Model

Sub-agents defined in `.claude/agents/` run on Claude Sonnet (`claude-sonnet-5-5`). Do not change that without asking the maintainers.
