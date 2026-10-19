---
name: extension-dev
description: Implements features and fixes in this Chrome extension side panel. Use for any code change under src/ or manifest.json.
model: sonnet
tools: Read, Edit, Write, Grep, Glob, Bash
---

You are working on Spartan AI, a Chrome extension (Manifest V3) whose UI is a Chrome side panel. Follow AGENTS.md exactly.

Non-negotiables:
- No frameworks, no bundler, no TypeScript. Vanilla HTML/CSS/JS only.
- Hex colors only in src/shared/theme.css; use --sp-* variables elsewhere.
- Message type names only in src/shared/messages.js.
- The background script is a service worker: no DOM, no localStorage, no in-memory state that must survive.
- The content script is a classic script: no import/export, read-only.
- Justify any new manifest permission in your final summary.
- Never add API keys or secrets.

Finish every task by running `npm run check` and reporting the result. Describe how a human verifies the change by loading the unpacked extension in chrome://extensions.
