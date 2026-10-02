# Component markup

Copy these as-is; the classes are already styled in `src/sidepanel/sidepanel.css`.

## Tab + panel

```html
<!-- in <nav class="tabs"> -->
<button class="tab" role="tab" aria-selected="false" data-tab="history">History</button>

<!-- after the other <section class="panel"> blocks -->
<section class="panel" id="panel-history" role="tabpanel" data-panel="history" hidden>
  ...
</section>
```

No JS needed: `sidepanel.js` wires every `.tab` to the `.panel` with the same name.

## Card with sections

```html
<div class="card">
  <h3>Section title</h3>
  <p>Body text or any of the pieces below.</p>
  <h3>Another section</h3>
  ...
</div>
```

## Field (text, url, select)

```html
<label class="field">
  <span>Label</span>
  <input type="text" name="fieldName" placeholder="Optional" />
</label>

<label class="field">
  <span>Choice</span>
  <select name="choice">
    <option value="a">A</option>
  </select>
</label>
```

## Checkbox row

```html
<label class="field field--check">
  <input type="checkbox" name="flag" />
  <span>Human-readable description of the flag</span>
</label>
```

## Buttons

```html
<div class="row">
  <button type="submit" class="btn btn--primary">Save</button>
  <button type="button" class="btn">Secondary</button>
  <button type="button" class="btn btn--danger">Delete</button>
</div>
```

## Chips (suggestion pills)

```html
<div class="chips">
  <button class="chip" data-prompt="Summarize this page">Summarize page</button>
</div>
```

`data-prompt` is copied into the composer on click.

## Key / value list

```html
<dl class="kv">
  <dt>Title</dt><dd id="ctx-title">—</dd>
  <dt>URL</dt><dd id="ctx-url">—</dd>
</dl>
```

## Chat bubbles (rendered by `renderMessage(role, text, pending)`)

```html
<div class="msg msg--user">What the user typed</div>
<div class="msg msg--ai is-pending">Thinking…</div>
<div class="msg msg--ai is-error">No model connected yet.</div>
```

## Empty state

```html
<div class="empty" id="empty-state">
  <img src="../../assets/logo-transparent.png" alt="" width="96" height="96" />
  <h2>Heading</h2>
  <p>One or two short sentences.</p>
  <div class="chips">...</div>
</div>
```

## Small print

```html
<p class="hint"><kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line.</p>
```

## Adding a token

In `src/shared/theme.css`, add to `:root` and, if the color must change in dark mode, to both dark blocks:

```css
:root { --sp-warning: #b26a00; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --sp-warning: #ffb95c; } }
:root[data-theme="dark"] { --sp-warning: #ffb95c; }
```
