# Contributing to Spartain AI

## What this project is

**This is a Google Chrome browser extension, built on Manifest V3, whose UI lives in Chrome's side panel** (`chrome.sidePanel`). It is not a web app, not a React app, not a Node server. There is no build step: the files in this repo are loaded into Chrome as they are.

If you are using an AI assistant (Claude, ChatGPT, Copilot, Cursor, etc.) to work on this repo, **tell it this in your first message**:

> This repo is a Chrome extension (Manifest V3) that runs as a side panel. Vanilla HTML/CSS/JS, no bundler. Read AGENTS.md before changing anything.

AI tools otherwise tend to assume a website or a Node project and will add frameworks, `document` access from the service worker, or `localStorage`, none of which work here.

## Ground rules

1. **Keep it vanilla.** No React, no bundler, no TypeScript, unless the team agrees first. `manifest.json` points straight at the files in `src/`.
2. **Colors live in `src/shared/theme.css`.** Do not hard-code hex values in other files. Brand green is `#076124`, white is `#ffffff`.
3. **Message types live in `src/shared/messages.js`.** Add the constant there before using it anywhere.
4. **Minimal permissions.** Every new entry in `manifest.json` `permissions` or `host_permissions` needs a one-line reason in the PR.
5. **No secrets in the extension.** API keys must never be shipped in extension code; anyone can unzip it. AI calls go through a backend the team controls.
6. **Service worker is stateless.** Chrome kills it whenever it wants. Persist with `chrome.storage`, never with module-level variables.
7. **Content script stays read-only and small.** It answers "what's on this page". It does not modify pages.
8. **Run `npm run check` before pushing.** CI runs it too.

## Chrome extension facts collaborators trip on

| Context | Has `document`/`window`? | Can use ES modules? | Talks to |
|---|---|---|---|
| Side panel (`src/sidepanel/`) | Yes | Yes (`type="module"`) | Background and content script via `chrome.runtime` / `chrome.tabs.sendMessage` |
| Background service worker (`src/background/`) | **No** | Yes (`"type": "module"` in manifest) | Everything via `chrome.runtime` |
| Content script (`src/content/`) | Yes (the web page's) | **No** (classic script) | Background/panel via `chrome.runtime.onMessage` |

- `chrome.storage.local` is the persistence layer. `localStorage` in the service worker does not exist.
- Content scripts are only injected into pages loaded *after* the extension was installed or reloaded. The side panel already falls back to tab title/URL when the content script is not there.
- `chrome://` and the Web Store pages never get content scripts.
- Minimum Chrome version is 116 (side panel API with `openPanelOnActionClick`).

## Workflow

1. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Make the change. Reload the extension in `chrome://extensions` and test in the side panel.
3. `npm run check` (and `npm run lint` if you have run `npm install`).
4. Open a PR using the template. Include a screenshot for any UI change.
5. One approval, green CI, then squash-merge.

Version bumps: change `version` in `manifest.json` only. Follow `MAJOR.MINOR.PATCH`.

## Claude on GitHub

The repo has the Claude Code GitHub Action (`.github/workflows/claude.yml`). Mention `@claude` in an issue or PR comment and it will respond, running on Claude Sonnet. It needs an `ANTHROPIC_API_KEY` repository secret (Settings > Secrets and variables > Actions) and the Claude GitHub App installed on the repo. Without both, the workflow does nothing.

Local Claude Code users get the same rules automatically through `CLAUDE.md` and `.claude/`.
