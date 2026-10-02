# CLAUDE.md

This repository is a **Chrome extension (Manifest V3) running as a side panel**. Read `AGENTS.md` for all constraints; it is the source of truth for AI agents and applies here in full.

Quick facts:
- No build step. No frameworks. Vanilla HTML/CSS/JS loaded straight from `src/`.
- AI backend is a local model, reached only from `src/ai/provider.js`. Not the Anthropic API.
- UI framework only today. Stubs with contracts: `src/ai/provider.js`, `src/sidepanel/storage.js`, `src/sidepanel/page-context.js`, `src/content/content.js`. Open work: `docs/ROADMAP.md`.
- Colors only in `src/shared/theme.css`. Brand green `#076124`, white.
- Message constants only in `src/shared/messages.js`.
- Background = service worker (no DOM). Content script = classic script (no imports).
- Run `npm run check` before you consider a task done.
- Any visual or layout change in the side panel: load the `sidepanel-ui` skill first (`.claude/skills/sidepanel-ui/`). It has the token rules, component recipes, and a screenshot script.
- Delegate to the sub-agents in `.claude/agents/` (they run on Sonnet) for review and UI work.
