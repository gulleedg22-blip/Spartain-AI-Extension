---
name: sidepanel-ui
description: How to build and change the user interface of the Spartain AI Chrome extension side panel (tabs, cards, forms, buttons, chips, chat bubbles, empty states, settings sections, theme and dark mode, layout, icons). Use this skill for ANY visual or layout change in src/sidepanel/ or src/shared/theme.css, even a small one like "add a button", "make this look better", "add a tab", "change the colors", "it looks off in dark mode", or "take a screenshot of the panel". Also use it when asked to verify or screenshot the extension UI.
---

# Side panel UI

The side panel is a narrow vertical strip inside Chrome, usually 320 to 420 px wide and as tall as the window. Everything below exists to keep it fast, consistent, and green-and-white without a framework. Read this once, then follow the workflow at the end.

## Where UI lives

| What | File | Note |
|---|---|---|
| Markup | `src/sidepanel/index.html` | One page, three tab panels |
| Layout styles | `src/sidepanel/sidepanel.css` | Uses only `--sp-*` variables |
| Colors, spacing, radius, font | `src/shared/theme.css` | The only file where a hex color may appear |
| Behaviour | `src/sidepanel/sidepanel.js` | Tabs, rendering, forms. Real work goes through the stubs it imports |
| Icons, logo | `assets/` | PNG only, generated from the Spartan helmet |

`npm run check` fails the build if a hex color shows up outside `theme.css`. That rule is what keeps the brand consistent when ten people touch the CSS, so add a token instead of fighting it.

## Design language

- **Brand**: green `--sp-green` (#076124, sampled from the logo) on white. Green is for the header, primary buttons, active tab, user chat bubbles, and section headings. Everything else is neutral gray so the green stays meaningful.
- **Dark mode** is automatic. Semantic tokens (`--sp-bg`, `--sp-text`, `--sp-border`, `--sp-bubble-ai`, ...) flip under `prefers-color-scheme: dark` and under `:root[data-theme="dark"]`. Style with semantic tokens and dark mode costs nothing. Style with raw palette tokens like `--sp-gray-900` and you will ship an unreadable dark mode.
- **Spacing** uses `--sp-space-1..4` (4, 8, 12, 16 px). **Radius** is `--sp-radius` (10) for containers and `--sp-radius-sm` (6) for controls.
- **Type**: system font stack, 14 px base. Section headings inside cards are 13 px uppercase green (`.card h3`). Hints are 11 px muted (`.hint`). No remote fonts: the panel must open instantly and offline.
- **Width**: the panel can be as narrow as 280 px. Wrap, truncate with ellipsis, or stack. Never set a fixed pixel width on content.
- **Height**: the app is a flex column (`.app`), the active `.panel` fills the remaining height and scrolls. The chat composer sticks to the bottom because `.messages` has `flex: 1; min-height: 0`. Keep that pattern when adding a tall section.

## Component recipes

Reuse these classes before inventing new ones. Full markup for each is in `references/components.md`.

| Need | Classes | Notes |
|---|---|---|
| New tab | `.tab` button + `.panel[data-panel]` section | Add both with matching `data-tab` / `data-panel`. The tab code in `sidepanel.js` picks it up with no JS change. |
| Grouped content | `.card` with an `h3` | Multiple `h3`s inside one card make sub-sections |
| Label + input | `.field` | Wrap `<span>` label and the control in a `<label>` |
| Checkbox row | `.field.field--check` | |
| Buttons | `.btn`, `.btn.btn--primary`, `.btn.btn--danger` | One primary per view. Put buttons in `.row` |
| Suggestion pills | `.chip` with `data-prompt` | Clicking fills the composer |
| Key/value readout | `dl.kv` | Used by the Tools tab |
| Chat bubbles | `.msg.msg--user` / `.msg.msg--ai` | `.is-pending` while waiting, `.is-error` for failures |
| Empty state | `.empty` with logo, `h2`, `p`, `.chips` | Hide it once content exists |
| Small print | `.hint`, `kbd` | |

## Wiring behaviour

`sidepanel.js` keeps an `els` map of DOM nodes at the top. Add your element there, then attach listeners below the matching section comment. Render text with `textContent`, never `innerHTML` with anything a page or model produced; the panel shows content from arbitrary web pages and a local model, and an injected `<img onerror>` runs with extension privileges.

Keep the UI file free of real work. Model calls go through `src/ai/provider.js`, persistence through `src/sidepanel/storage.js`, page reading through `src/sidepanel/page-context.js`. If your UI needs data those stubs do not provide yet, add the call against the stub's contract and let the stub return a default.

## Accessibility that is already there, keep it

Tabs use `role="tablist"`, `role="tab"`, `aria-selected`, and `role="tabpanel"`. The message list is `aria-live="polite"`. Every input has a visible label. Interactive elements show `:focus-visible` outlines in brand green. Match those when you add things; a keyboard user should be able to reach your control with Tab and see where they are.

## Workflow

1. Read `src/shared/theme.css` and `src/sidepanel/index.html` before changing anything, so you reuse tokens and classes instead of duplicating them.
2. Write markup in `index.html`, style in `sidepanel.css` with tokens, wire in `sidepanel.js`.
3. Run `npm run check` (manifest, syntax, hex-color rule) and `npm run lint`.
4. Look at it. Run the bundled screenshot script, which loads the real extension in headless Chromium and captures the panel:

   ```bash
   node .claude/skills/sidepanel-ui/scripts/screenshot.mjs --out /tmp/shots            # chat tab, light
   node .claude/skills/sidepanel-ui/scripts/screenshot.mjs --out /tmp/shots --tab settings --dark
   node .claude/skills/sidepanel-ui/scripts/screenshot.mjs --out /tmp/shots --send "hello"   # exercise the composer
   ```

   It prints the extension id, the header status, and any console errors, then writes `panel-<tab>-<light|dark>.png`. Open the PNG and check it at light and dark before calling the change done. First run on a new machine may need `npx playwright install chromium`.
5. Put the screenshot in the PR. The PR template asks for one on every UI change because reviewers cannot load the extension from a diff.

## Things that look right and are wrong

- A `style=""` attribute or a hex color in `sidepanel.css`. Use a token; add one to `theme.css` if none fits.
- `position: fixed` for the composer. It works until the Settings tab needs to scroll. The flex layout already pins it.
- A new `<script>` tag or a CDN link. Extension pages block remote scripts by Manifest V3 policy and the page would silently break.
- Setting `hidden` on a panel without toggling `.is-active`, or vice versa. The tab code toggles both; let it.
- Testing only in light mode. Half the team runs dark.
