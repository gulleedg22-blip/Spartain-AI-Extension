# CLAUDE.md

This repository is a **Chrome extension (Manifest V3) running as a side panel**. Read `AGENTS.md` for all constraints; it is the source of truth for AI agents and applies here in full.

Quick facts:
- No build step. No frameworks. Vanilla HTML/CSS/JS loaded straight from `src/`.
- AI backend lives only in `src/ai/provider.js`: Ollama locally by default, or Anthropic with the user's own key from Settings (chrome.storage.local, never the repo).
- Open work: `docs/ROADMAP.md`.
- Colors only in `src/shared/theme.css`. Brand green `#076124`, white.
- Message constants only in `src/shared/messages.js`.
- Background = service worker (no DOM). Content script = classic script (no imports).
- Run `npm run check` before you consider a task done.
- Delegate to the sub-agents in `.claude/agents/` (they run on Sonnet) for review and UI work.
