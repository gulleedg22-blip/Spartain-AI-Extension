// Side panel UI logic. Vanilla JS, no build step.
// Layout only: the AI reply is a stub (see `respond()`), replace it with a
// real backend call. Never put API keys in this extension; call your own server.

import { MSG, STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/messages.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel'),
  messages: $('#messages'),
  empty: $('#empty-state'),
  composer: $('#composer'),
  input: $('#input'),
  send: $('#send'),
  status: $('#status'),
  pageTitle: $('#page-title'),
  ctxTitle: $('#ctx-title'),
  ctxUrl: $('#ctx-url'),
  ctxSelection: $('#ctx-selection'),
  refreshContext: $('#refresh-context'),
  settingsForm: $('#settings-form'),
  settingsStatus: $('#settings-status'),
  clearHistory: $('#clear-history'),
  version: $('#version'),
};

let settings = { ...DEFAULT_SETTINGS };
let history = [];

/* ---------- Tabs ---------- */
els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    els.tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    els.panels.forEach((p) => {
      const on = p.dataset.panel === tab.dataset.tab;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
    if (tab.dataset.tab === 'tools') refreshContext();
  });
});

/* ---------- Storage ---------- */
async function loadState() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.HISTORY]);
  settings = { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] ?? {}) };
  history = Array.isArray(data[STORAGE_KEYS.HISTORY]) ? data[STORAGE_KEYS.HISTORY] : [];
  applyTheme();
  fillSettingsForm();
  history.forEach((m) => renderMessage(m.role, m.text));
}
const saveSettings = () => chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
const saveHistory = () => chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history.slice(-200) });

function applyTheme() {
  if (settings.theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = settings.theme;
}

/* ---------- Settings form ---------- */
function fillSettingsForm() {
  const f = els.settingsForm.elements;
  f.displayName.value = settings.displayName;
  f.theme.value = settings.theme;
  f.includePageContext.checked = settings.includePageContext;
}
els.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = els.settingsForm.elements;
  settings = {
    displayName: f.displayName.value.trim(),
    theme: f.theme.value,
    includePageContext: f.includePageContext.checked,
  };
  await saveSettings();
  applyTheme();
  els.settingsStatus.textContent = 'Saved.';
  setTimeout(() => (els.settingsStatus.textContent = ''), 1500);
});
els.clearHistory.addEventListener('click', async () => {
  history = [];
  await saveHistory();
  els.messages.querySelectorAll('.msg').forEach((n) => n.remove());
  els.empty.hidden = false;
});

/* ---------- Page context ---------- */
async function getPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) return { title: tab?.title ?? '', url: tab?.url ?? '', selection: '' };
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: MSG.GET_PAGE_CONTEXT });
  } catch {
    // Content script not injected yet (e.g. page loaded before install). Fall back to tab info.
    return { title: tab.title ?? '', url: tab.url ?? '', selection: '' };
  }
}
async function refreshContext() {
  const ctx = await getPageContext();
  els.pageTitle.textContent = ctx.title || ctx.url || 'No page context';
  els.ctxTitle.textContent = ctx.title || '—';
  els.ctxUrl.textContent = ctx.url || '—';
  els.ctxSelection.textContent = ctx.selection || '—';
  return ctx;
}
els.refreshContext.addEventListener('click', refreshContext);
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.TAB_CHANGED) refreshContext();
});

/* ---------- Chat ---------- */
function renderMessage(role, text, pending = false) {
  els.empty.hidden = true;
  const div = document.createElement('div');
  div.className = `msg msg--${role}${pending ? ' is-pending' : ''}`;
  div.textContent = text;
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  return div;
}

// STUB: replace with a call to your backend. Do not call model APIs directly
// from the extension with an embedded key.
async function respond(userText, ctx) {
  await new Promise((r) => setTimeout(r, 400));
  const where = ctx?.title ? ` (about "${ctx.title}")` : '';
  return `AI is not connected yet${where}. You said: ${userText}`;
}

async function sendMessage() {
  const text = els.input.value.trim();
  if (!text) return;
  els.input.value = '';
  autosize();
  els.send.disabled = true;

  renderMessage('user', text);
  history.push({ role: 'user', text, at: Date.now() });

  const ctx = settings.includePageContext ? await getPageContext() : null;
  const pending = renderMessage('ai', 'Thinking…', true);
  try {
    const reply = await respond(text, ctx);
    pending.textContent = reply;
    pending.classList.remove('is-pending');
    history.push({ role: 'ai', text: reply, at: Date.now() });
  } catch (err) {
    pending.textContent = `Error: ${err?.message ?? err}`;
    pending.classList.remove('is-pending');
  } finally {
    els.send.disabled = false;
    await saveHistory();
    els.input.focus();
  }
}

els.composer.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
function autosize() {
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight, 140) + 'px';
}
els.input.addEventListener('input', autosize);
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => { els.input.value = chip.dataset.prompt; autosize(); els.input.focus(); });
});

/* ---------- Boot ---------- */
async function boot() {
  els.version.textContent = 'v' + chrome.runtime.getManifest().version;
  await loadState();
  await refreshContext();
  try {
    const pong = await chrome.runtime.sendMessage({ type: MSG.PING });
    els.status.classList.toggle('is-ok', !!pong?.ok);
  } catch {
    els.status.classList.add('is-bad');
  }
}
boot();
