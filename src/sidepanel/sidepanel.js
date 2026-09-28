// Side panel UI. Vanilla JS, no build step.
// This file owns LAYOUT BEHAVIOUR ONLY: tabs, rendering messages, the
// composer, theme, and the settings form. Everything that does real work is
// behind three boundaries that are still open for contributors:
//   src/ai/provider.js          -> the local model call
//   src/sidepanel/storage.js    -> chrome.storage persistence
//   src/sidepanel/page-context.js -> what is on the current tab

import { MSG, DEFAULT_SETTINGS } from '../shared/messages.js';
import { generate, ProviderNotConfiguredError } from '../ai/provider.js';
import { loadSettings, saveSettings, loadHistory, saveHistory, clearHistory } from './storage.js';
import { getPageContext } from './page-context.js';

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

/* ---------- Theme ---------- */
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
  f.modelEndpoint.value = settings.modelEndpoint;
  f.modelName.value = settings.modelName;
}
els.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = els.settingsForm.elements;
  settings = {
    ...settings,
    displayName: f.displayName.value.trim(),
    theme: f.theme.value,
    includePageContext: f.includePageContext.checked,
    modelEndpoint: f.modelEndpoint.value.trim(),
    modelName: f.modelName.value.trim(),
  };
  await saveSettings(settings);
  applyTheme();
  flash('Saved (in memory only until storage is implemented).');
});
els.clearHistory.addEventListener('click', async () => {
  history = [];
  await clearHistory();
  els.messages.querySelectorAll('.msg').forEach((n) => n.remove());
  els.empty.hidden = false;
});
function flash(text) {
  els.settingsStatus.textContent = text;
  setTimeout(() => (els.settingsStatus.textContent = ''), 2500);
}

/* ---------- Page context (Tools tab + header subtitle) ---------- */
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

async function sendMessage() {
  const text = els.input.value.trim();
  if (!text) return;
  els.input.value = '';
  autosize();
  els.send.disabled = true;

  renderMessage('user', text);
  history.push({ role: 'user', text, at: Date.now() });

  const context = settings.includePageContext ? await getPageContext() : null;
  const pending = renderMessage('ai', 'Thinking…', true);
  try {
    const reply = await generate({ messages: history, context, settings, signal: undefined });
    pending.textContent = reply;
    history.push({ role: 'ai', text: reply, at: Date.now() });
  } catch (err) {
    pending.textContent = err instanceof ProviderNotConfiguredError
      ? 'No model connected yet. This build is the UI framework only.'
      : `Error: ${err?.message ?? err}`;
    pending.classList.add('is-error');
  } finally {
    pending.classList.remove('is-pending');
    els.send.disabled = false;
    await saveHistory(history);
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
  settings = await loadSettings();
  history = await loadHistory();
  applyTheme();
  fillSettingsForm();
  history.forEach((m) => renderMessage(m.role, m.text));
  await refreshContext();
  try {
    const pong = await chrome.runtime.sendMessage({ type: MSG.PING });
    els.status.classList.toggle('is-ok', !!pong?.ok);
  } catch {
    els.status.classList.add('is-bad');
  }
}
boot();
