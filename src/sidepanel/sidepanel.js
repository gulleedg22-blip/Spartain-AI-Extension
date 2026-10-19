// Side panel UI. Vanilla JS, no build step.
// This file owns UI behaviour: tabs, rendering messages, the composer, theme,
// and the settings form. Real work lives behind three modules:
//   src/ai/provider.js            -> the model call (local Ollama or user's own Anthropic key)
//   src/sidepanel/storage.js      -> chrome.storage persistence
//   src/sidepanel/page-context.js -> what is on the current tab

import { MSG, DEFAULT_SETTINGS } from '../shared/messages.js';
import { generate, ProviderNotConfiguredError } from '../ai/provider.js';
import { loadSettings, saveSettings, loadHistory, saveHistory, clearHistory } from './storage.js';
import { getPageContext } from './page-context.js';
import { loadScheduleData, dayTypeFor, whereInDay, fmt } from '../tools/schedule.js';
import { checkForUpdate, reloadExtension } from '../update/check.js';

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
  scheduleDay: $('#schedule-day'),
  scheduleNow: $('#schedule-now'),
  scheduleBlocks: $('#schedule-blocks'),
  updateBanner: $('#update-banner'),
  updateText: $('#update-text'),
  updateReload: $('#update-reload'),
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
    if (tab.dataset.tab === 'tools') { refreshContext(); renderSchedule(); }
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
  f.checkForUpdates.checked = settings.checkForUpdates !== false;
  f.provider.value = settings.provider;
  f.modelEndpoint.value = settings.modelEndpoint;
  f.modelName.value = settings.modelName;
  f.anthropicApiKey.value = settings.anthropicApiKey ?? '';
  f.anthropicModel.value = settings.anthropicModel ?? 'claude-sonnet-5-5';
  f.proxyUrl.value = settings.proxyUrl ?? '';
  f.proxyPasscode.value = settings.proxyPasscode ?? '';
  showProviderFields(f.provider.value);
}
function showProviderFields(provider) {
  els.settingsForm.querySelectorAll('[data-provider-fields]').forEach((el) => {
    el.hidden = !el.dataset.providerFields.split(/\s+/).includes(provider);
  });
}
els.settingsForm.elements.provider.addEventListener('change', (e) => showProviderFields(e.target.value));
els.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = els.settingsForm.elements;
  settings = {
    ...settings,
    displayName: f.displayName.value.trim(),
    theme: f.theme.value,
    includePageContext: f.includePageContext.checked,
    checkForUpdates: f.checkForUpdates.checked,
    provider: f.provider.value,
    modelEndpoint: f.modelEndpoint.value.trim(),
    modelName: f.modelName.value.trim(),
    anthropicApiKey: f.anthropicApiKey.value.trim(),
    anthropicModel: f.anthropicModel.value,
    proxyUrl: f.proxyUrl.value.trim(),
    proxyPasscode: f.proxyPasscode.value.trim(),
  };
  await saveSettings(settings);
  applyTheme();
  flash('Saved.');
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

/* ---------- Schedule tool ---------- */
let scheduleData = null;
async function renderSchedule() {
  try {
    scheduleData ??= await loadScheduleData();
  } catch (e) {
    els.scheduleDay.textContent = `Could not load schedule data (${e.message}).`;
    return;
  }
  const now = new Date();
  const day = dayTypeFor(now, scheduleData);
  els.scheduleDay.textContent = `Today: ${day.label}`;
  els.scheduleBlocks.replaceChildren();
  if (!day.schedule) { els.scheduleNow.textContent = ''; return; }
  const blocks = scheduleData.bell.dayTypes[day.schedule].blocks.filter((b) => !b.optional);
  const pos = whereInDay(blocks, now);
  if (pos.current) els.scheduleNow.textContent = `Now: ${pos.current.name}, ${pos.minutesLeft} min left` + (pos.next ? `. Next: ${pos.next.name} at ${fmt(pos.next.start)}` : '');
  else if (pos.next) els.scheduleNow.textContent = `Next: ${pos.next.name} at ${fmt(pos.next.start)} (in ${pos.minutesUntilNext} min)`;
  else els.scheduleNow.textContent = 'School day is over.';
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const b of blocks) {
    const li = document.createElement('li');
    const [eh, em] = b.end.split(':').map(Number);
    if (b === pos.current) li.classList.add('is-now');
    else if (eh * 60 + em <= nowMin) li.classList.add('is-past');
    const name = document.createElement('span'); name.textContent = b.name;
    const t = document.createElement('span'); t.className = 't'; t.textContent = `${fmt(b.start)}–${fmt(b.end)}`;
    li.append(name, t);
    els.scheduleBlocks.appendChild(li);
  }
}
setInterval(() => { if (!els.scheduleBlocks.closest('.panel').hidden) renderSchedule(); }, 30000);

/* ---------- Page tools ---------- */
const TOOL_PROMPTS = {
  summarize: 'Summarize this page in 5 bullet points, then one sentence on why it matters.',
  explain: 'Explain the selected text simply, like I am a high school student seeing it for the first time. If nothing is selected, say so.',
  studyguide: 'Make a study guide from this page: key terms with definitions, main ideas, and 3 likely test questions with answers.',
  flashcards: 'Turn the selected text (or the page if nothing is selected) into 8 flashcards. Format each as "Q: ... / A: ...".',
  cite: 'Give an MLA 9 citation and an APA 7 citation for this page using its title and URL. Use today\'s date as the access date if no publication date is visible.',
  quiz: 'Quiz me on this page: ask 5 questions one at a time, wait for my answer each time, and grade me at the end.',
};
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    els.input.value = TOOL_PROMPTS[btn.dataset.tool] ?? '';
    document.querySelector('[data-tab="chat"]').click();
    sendMessage();
  });
});

/* ---------- Update check ---------- */
async function maybeCheckForUpdate() {
  if (settings.checkForUpdates === false) return;
  try {
    const u = await checkForUpdate();
    if (u.updateAvailable) {
      els.updateText.textContent = `v${u.remote} is on GitHub (you have v${u.local}). Pull main, then reload.`;
      els.updateBanner.hidden = false;
    }
  } catch { /* offline or rate-limited: stay quiet */ }
}
els.updateReload.addEventListener('click', reloadExtension);

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const reply = await generate({ messages: history, context, settings, signal: controller.signal });
    pending.textContent = reply;
    history.push({ role: 'ai', text: reply, at: Date.now() });
  } catch (err) {
    pending.textContent = err instanceof ProviderNotConfiguredError
      ? `${err.message}`
      : err?.name === 'AbortError' ? 'Timed out waiting for the model.' : `Error: ${err?.message ?? err}`;
    pending.classList.add('is-error');
  } finally {
    clearTimeout(timeout);
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
  maybeCheckForUpdate();
  try {
    const pong = await chrome.runtime.sendMessage({ type: MSG.PING });
    els.status.classList.toggle('is-ok', !!pong?.ok);
  } catch {
    els.status.classList.add('is-bad');
  }
}
boot();
