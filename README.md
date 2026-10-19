# Spartan AI Extension

A **Google Chrome extension** (Manifest V3) that opens as a **side panel**. Green and white, Spartan helmet logo.

**Current state: working chat and tools.** Three AI backends, chosen in Settings: a **local model** through [Ollama](https://ollama.com) on your own computer (default, nothing leaves your machine), the **Anthropic API with your own key** (stored only in your browser, never in this repo), or a **team proxy** that holds one shared key server-side and takes a passcode (see [proxy/README.md](proxy/README.md)). Page context, settings, and chat history persist. Open work is in [docs/ROADMAP.md](docs/ROADMAP.md).

> New here (human or AI)? Read [CONTRIBUTING.md](CONTRIBUTING.md) first. AI coding agents also read [AGENTS.md](AGENTS.md).

<p align="center"><img src="docs/panel-light.png" width="300" alt="Side panel, light" /> <img src="docs/panel-settings-dark.png" width="300" alt="Settings tab, dark" /></p>

## Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder (the one with `manifest.json`).
4. Click the Spartan icon in the toolbar (or press `Ctrl+Shift+S`, `Cmd+Shift+S` on Mac). The side panel opens.

After editing files, click the reload icon on the extension card in `chrome://extensions`. Side panel HTML/CSS changes show after closing and reopening the panel.

## Layout

```
manifest.json                 Extension manifest (MV3). Permissions live here.
assets/
  logo.png                    Original Spartan helmet logo
  logo-transparent.png        Logo with white keyed out (used in the panel)
  icons/icon-{16,32,48,128}.png
src/
  ai/provider.js                Model call: Ollama /api/chat or Anthropic Messages API
  background/service-worker.js  Opens the panel on toolbar click
  content/content.js            Page title / URL / selection reader (read-only)
  sidepanel/index.html          The side panel UI (Chat, Tools, Settings tabs)
  sidepanel/sidepanel.css       Layout styles
  sidepanel/sidepanel.js        Tabs, chat rendering, composer, settings form
  sidepanel/storage.js          chrome.storage persistence
  sidepanel/page-context.js     Current-tab context
  shared/theme.css              Color and spacing tokens (brand green lives here)
  shared/messages.js            Message types + storage keys shared by all scripts
  data/bell-schedule.json       Official DLS bell schedule, six day types
  data/school-calendar-2026-27.json  Semester dates, no-class days, observed day types
  tools/schedule.js             Day type, current block, next block (pure functions)
  update/check.js               Compares installed version with main on GitHub
  data/profile.example.json     Example student profile shape with made-up grades
proxy/                        Optional Cloudflare Worker that holds a shared key behind a passcode
docs/source/                  The school's bell schedule and calendar PDFs the data files came from
docs/ROADMAP.md               Open work
.claude/                      Claude Code config and agents (Sonnet)
.github/workflows/            CI + Claude GitHub Action
```

## Scripts

Requires Node 18+. No dependencies are needed to run the extension; `npm install` only pulls ESLint for `npm run lint`.

| Command | What it does |
|---|---|
| `npm run check` | Validates `manifest.json` and syntax-checks every JS file |
| `npm run lint` | ESLint over `src/` |
| `npm run zip` | Builds `dist/spartan-ai.zip` for the Chrome Web Store |

## Colors

| Token | Hex | Use |
|---|---|---|
| `--sp-green` | `#076124` | Primary. Sampled from the logo. |
| `--sp-green-dark` | `#054a1b` | Hover / pressed |
| `--sp-green-light` | `#e6f2ea` | Tints, chips |
| `--sp-white` | `#ffffff` | Background, text on green |

Reference site: https://www.dlshs.org/. Edit colors only in `src/shared/theme.css`.

## Status

- [x] Side panel opens from toolbar and keyboard shortcut
- [x] Chat / Tools / Settings layout, light and dark theme
- [x] Local model provider via Ollama, or Anthropic API with the user's own key
- [x] Settings and chat history persist in `chrome.storage.local`
- [x] Page title, URL, and selected text sent with messages (toggle in Settings)
- [x] Tools tab: live bell schedule (today's day type, current and next block) and six page tools
- [x] Update banner with one-click reload; zip attached to a GitHub Release on every merge
- [ ] Streaming replies
- [ ] Profile editor (roadmap 5b)
- [ ] Chrome Web Store listing (needed for true auto-update)

## Using it

1. Load unpacked (above), open the panel, go to **Settings**.
2. **Local model**: install Ollama, run `ollama pull llama3`, leave Ollama running. Endpoint `http://localhost:11434`, model `llama3`. Save.
3. **Anthropic**: pick "Anthropic API with my own key", paste your key, Save. The key lives in your browser profile only. Usage bills your key.
4. **Team proxy**: the owner deploys `proxy/` once (5 minutes, free), then shares a URL and passcode. Pick "Team proxy with a passcode", enter both, Save. Nobody but the owner ever sees the key.

## Tools tab

- **Schedule**: today's day type from `src/data/school-calendar-2026-27.json` (observed days first, then the Mon 0-7 / Tue-Thu A / Wed-Fri B pattern), the block happening now, minutes left, and what is next. Times come from the official bell schedule.
- **Page tools**: Summarize, Explain selection, Study guide, Flashcards, Cite (MLA and APA), Quiz me. Each sends a prompt with the page attached and switches to Chat.

## Updating

Chrome only auto-updates extensions installed from the Chrome Web Store. For an unpacked install:

- **From a git clone**: the panel checks `main` once an hour and shows a banner when a newer version exists. Run `git pull`, then click **Reload** in the banner (or the reload icon in `chrome://extensions`).
- **From a zip**: every merge to `main` attaches `spartan-ai.zip` to a [GitHub Release](https://github.com/gulleedg22-blip/Spartain-AI-Extension/releases/latest). Download, unzip over your old folder, reload.
- **Real auto-update**: publish to the Chrome Web Store (one-time $5 developer registration, a few days of review). After that, Chrome updates everyone automatically and the Release zip is what you upload. The release workflow can be extended to publish there once the store credentials exist as repository secrets.

## Using Claude on GitHub

Comment `@claude` on any issue or pull request, for example `@claude implement the storage module per its contract`. The workflow in `.github/workflows/claude.yml` runs Claude Sonnet with the repo rules from `AGENTS.md`. A maintainer must first add the `ANTHROPIC_API_KEY` repository secret and install the Claude GitHub App on the repo.
