// Side panel UI. Vanilla JS, no build step.
// This file owns UI behaviour: tabs, chat, now bar, schedule, settings.
// Real work lives behind these modules:
//   src/ai/provider.js            -> the model call
//   src/sidepanel/storage.js      -> chrome.storage persistence
//   src/sidepanel/page-context.js -> what is on the current tab
//   src/sidepanel/markdown.js     -> safe Markdown -> DOM (never innerHTML)
//   src/tools/schedule.js         -> schedule snapshot
//   src/update/check.js           -> update check

import { MSG, DEFAULT_SETTINGS, TERMS_VERSION } from '../shared/messages.js';
import { generate, ProviderNotConfiguredError } from '../ai/provider.js';
import { loadSettings, saveSettings, loadHistory, saveHistory, clearHistory } from './storage.js';
import { getPageContext } from './page-context.js';
import { loadScheduleData, scheduleSnapshot, fmt } from '../tools/schedule.js';
import { checkForUpdate, reloadExtension } from '../update/check.js';
import { renderMarkdown } from './markdown.js';

const $ = (sel) => document.querySelector(sel);
const els = {
  tabs: [...document.querySelectorAll('.tab')],
  panels: document.querySelectorAll('.panel'),
  messages: $('#messages'),
  empty: $('#empty-state'),
  emptyChips: $('#empty-chips'),
  emptySetup: $('#empty-setup'),
  chatToolbar: $('#chat-toolbar'),
  newChat: $('#new-chat'),
  composer: $('#composer'),
  gate: $('#terms-gate'),
  termsAccept: $('#terms-accept'),
  termsStatus: $('#terms-status'),
  chatHint: $('#chat-hint'),
  input: $('#input'),
  send: $('#send'),
  stop: $('#stop'),
  contextChip: $('#context-chip'),
  providerChip: $('#provider-chip'),
  nowbar: $('#nowbar'),
  nowbarMain: $('#nowbar-main'),
  nowbarSide: $('#nowbar-side'),
  nowbarFill: $('#nowbar-fill'),
  ctxTitle: $('#ctx-title'),
  ctxUrl: $('#ctx-url'),
  ctxSelection: $('#ctx-selection'),
  refreshContext: $('#refresh-context'),
  settingsForm: $('#settings-form'),
  settingsStatus: $('#settings-status'),
  clearHistory: $('#clear-history'),
  testConnection: $('#test-connection'),
  testStatus: $('#test-status'),
  version: $('#version'),
  updateStatus: $('#update-status'),
  checkNow: $('#check-now'),
  releasesLink: $('#releases-link'),
  scheduleCard: $('#schedule-card'),
  scheduleDay: $('#schedule-day'),
  scheduleNote: $('#schedule-note'),
  scheduleNow: $('#schedule-now'),
  scheduleBlocks: $('#schedule-blocks'),
  updateBanner: $('#update-banner'),
  updateText: $('#update-text'),
  updateReload: $('#update-reload'),
  updateCopy: $('#update-copy'),
};
const form = els.settingsForm.elements;

let settings = { ...DEFAULT_SETTINGS };
let history = [];
let pending = null; // { controller, bubble, userStopped } while a reply is in flight

/* ---------- Tabs ---------- */
function activateTab(name, { focus = false } = {}) {
  els.tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  els.panels.forEach((p) => {
    const on = p.dataset.panel === name;
    p.classList.toggle('is-active', on);
    p.hidden = !on;
  });
  if (name === 'tools') { refreshContext(); renderSchedule(); }
}
els.tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', (e) => {
    const last = els.tabs.length - 1;
    const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    activateTab(els.tabs[to].dataset.tab, { focus: true });
  });
});

/* ---------- Provider status ---------- */
const CLAUDE_NAMES = { 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-haiku-4-5': 'Claude Haiku 4.5', 'claude-opus-5-5': 'Claude Opus 5.5' };
function providerState(s) {
  if (s.provider === 'anthropic') {
    return { ok: !!s.anthropicApiKey?.trim(), label: CLAUDE_NAMES[s.anthropicModel] ?? 'Claude' };
  }
  if (s.provider === 'proxy') return { ok: !!(s.proxyUrl?.trim() && s.proxyPasscode?.trim()), label: 'Team proxy' };
  return { ok: !!(s.modelEndpoint?.trim() && s.modelName?.trim()), label: `Local · ${s.modelName?.trim() ?? ''}` };
}
function renderProviderChip() {
  const st = providerState(settings);
  els.providerChip.textContent = st.ok ? st.label : 'Set up AI';
  els.providerChip.title = st.ok ? 'AI provider. Click to change it in Settings.' : 'No AI provider is set up yet';
  els.emptyChips.hidden = !st.ok;
  els.emptySetup.hidden = st.ok;
}
function openProviderSettings() {
  activateTab('settings', { focus: false });
  form.provider.focus();
}
els.providerChip.addEventListener('click', openProviderSettings);
els.emptySetup.addEventListener('click', openProviderSettings);

/* ---------- Theme ---------- */
function applyTheme(theme = settings.theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/* ---------- Settings form ---------- */
function fillSettingsForm() {
  form.displayName.value = settings.displayName ?? '';
  form.theme.value = settings.theme;
  form.includePageContext.checked = !!settings.includePageContext;
  form.showZeroPeriod.checked = !!settings.showZeroPeriod;
  form.checkForUpdates.checked = settings.checkForUpdates !== false;
  form.provider.value = settings.provider;
  form.modelEndpoint.value = settings.modelEndpoint ?? '';
  form.modelName.value = settings.modelName ?? '';
  form.anthropicApiKey.value = settings.anthropicApiKey ?? '';
  form.anthropicModel.value = settings.anthropicModel ?? 'claude-sonnet-5-5';
  form.proxyUrl.value = settings.proxyUrl ?? '';
  form.proxyPasscode.value = settings.proxyPasscode ?? '';
  showProviderFields(form.provider.value);
}
function readForm() {
  return {
    ...settings,
    displayName: form.displayName.value.trim(),
    theme: form.theme.value,
    includePageContext: form.includePageContext.checked,
    showZeroPeriod: form.showZeroPeriod.checked,
    checkForUpdates: form.checkForUpdates.checked,
    provider: form.provider.value,
    modelEndpoint: form.modelEndpoint.value.trim(),
    modelName: form.modelName.value.trim(),
    anthropicApiKey: form.anthropicApiKey.value.trim(),
    anthropicModel: form.anthropicModel.value,
    proxyUrl: form.proxyUrl.value.trim(),
    proxyPasscode: form.proxyPasscode.value.trim(),
  };
}
function showProviderFields(provider) {
  els.settingsForm.querySelectorAll('[data-provider-fields]').forEach((el) => {
    el.hidden = !el.dataset.providerFields.split(/\s+/).includes(provider);
  });
}
form.provider.addEventListener('change', (e) => { showProviderFields(e.target.value); els.testStatus.textContent = ''; });
form.theme.addEventListener('change', () => applyTheme(form.theme.value)); // live preview; commitSettings() persists it

const RESTING = 'Changes save automatically.';
let flashTimer;
function flash(text) {
  els.settingsStatus.textContent = text;
  els.settingsStatus.classList.add('is-ok');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { els.settingsStatus.textContent = RESTING; els.settingsStatus.classList.remove('is-ok'); }, 2000);
}
async function commitSettings() {
  const next = readForm();
  if (JSON.stringify(next) === JSON.stringify(settings)) return;
  settings = next;
  await saveSettings(settings);
  applyTheme();
  renderProviderChip();
  renderNowbar();
  renderSchedule();
  refreshContext();
  flash('Saved.');
}
let saveTimer = null;
function flushPending() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  commitSettings();
}
els.settingsForm.addEventListener('change', () => { clearTimeout(saveTimer); saveTimer = null; commitSettings(); });
els.settingsForm.addEventListener('input', (e) => {
  if (!['text', 'url', 'password'].includes(e.target.type)) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; commitSettings(); }, 600);
});
els.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(saveTimer);
  saveTimer = null;
  commitSettings();
});
window.addEventListener('pagehide', flushPending);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushPending(); });

els.testConnection.addEventListener('click', async () => {
  clearTimeout(saveTimer);
  saveTimer = null;
  await commitSettings();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const started = performance.now();
  els.testConnection.disabled = true;
  els.testStatus.className = 'test-status';
  els.testStatus.textContent = 'Testing…';
  try {
    await generate({ messages: [{ role: 'user', text: 'Reply with the single word OK.', at: Date.now() }], context: null, settings, signal: controller.signal });
    els.testStatus.textContent = `Connected. Replied in ${((performance.now() - started) / 1000).toFixed(1)} s.`;
    els.testStatus.classList.add('is-ok');
  } catch (err) {
    els.testStatus.textContent = err?.name === 'AbortError' ? 'Timed out after 30 s.' : (err?.message ?? String(err));
    els.testStatus.classList.add('is-bad');
  } finally {
    clearTimeout(timer);
    els.testConnection.disabled = false;
  }
});

// Two-step confirm button: first click arms for 3 s, second click runs the action.
function twoStep(btn, armedLabel, action) {
  const label = btn.textContent;
  let timer = null;
  const reset = () => { clearTimeout(timer); timer = null; btn.textContent = label; };
  btn.addEventListener('click', async () => {
    if (timer) { reset(); await action(); return; }
    btn.textContent = armedLabel;
    timer = setTimeout(reset, 3000);
  });
}
async function wipeChat() {
  pending?.controller.abort();
  history = [];
  await clearHistory();
  els.messages.querySelectorAll('.msg').forEach((n) => n.remove());
  updateChatState();
}
twoStep(els.clearHistory, 'Clear all? Click again', wipeChat);
twoStep(els.newChat, 'Clear chat? Click again', wipeChat);

/* ---------- Page context ---------- */
async function refreshContext() {
  const ctx = await getPageContext();
  els.ctxTitle.textContent = ctx.title || '—';
  els.ctxUrl.textContent = ctx.url || '—';
  els.ctxSelection.textContent = ctx.selection || '—';
  const title = ctx.title || ctx.url || 'this page';
  const sel = ctx.selection?.length;
  els.contextChip.textContent = !settings.includePageContext ? 'Page not included'
    : sel ? `Selection (${sel} chars) · ${title}` : `Page: ${title}`;
  els.contextChip.setAttribute('aria-pressed', String(!!settings.includePageContext));
  els.contextChip.title = els.contextChip.textContent;
  return ctx;
}
els.refreshContext.addEventListener('click', refreshContext);
els.contextChip.addEventListener('click', async () => {
  settings = { ...settings, includePageContext: !settings.includePageContext };
  form.includePageContext.checked = settings.includePageContext;
  await saveSettings(settings);
  refreshContext();
});
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.TAB_CHANGED) refreshContext();
});
window.addEventListener('focus', refreshContext);

/* ---------- Schedule: now bar + Tools card ---------- */
let scheduleData = null;
let scheduleFailed = false;
async function getSnapshot() {
  if (!scheduleData && !scheduleFailed) {
    try { scheduleData = await loadScheduleData(); } catch { scheduleFailed = true; }
  }
  if (!scheduleData) return null;
  return scheduleSnapshot(new Date(), scheduleData, { zeroPeriod: !!settings.showZeroPeriod });
}
function statusText(s) {
  const up = s.upcoming;
  switch (s.state) {
    case 'in-block':
      return { main: `${s.current.name} · ${s.minutesLeft} min left`, side: s.next ? `Next: ${s.next.name} ${fmt(s.next.start)}` : 'Last block' };
    case 'between':
      return { main: 'Passing period', side: `${s.next.name} at ${fmt(s.next.start)} · in ${s.minutesUntilNext} min` };
    case 'before':
      return { main: s.day.type, side: `${s.next.name} at ${fmt(s.next.start)}` };
    case 'after':
      return { main: 'School day is over', side: up ? `${up.dateLabel}: ${up.day.type}` : '' };
    default:
      return { main: s.day.label, side: up ? `Next: ${up.dateLabel} · ${up.day.type}` : '' };
  }
}
async function renderNowbar() {
  const s = await getSnapshot();
  if (!s) { els.nowbar.hidden = true; return; }
  const t = statusText(s);
  els.nowbar.hidden = false;
  els.nowbarMain.textContent = t.main;
  els.nowbarSide.textContent = t.side;
  els.nowbarFill.style.width = `${Math.round((s.progress ?? 0) * 100)}%`;
  els.nowbar.setAttribute('aria-label', `${t.main}${t.side ? '. ' + t.side : ''}. Open schedule.`);
}
async function renderSchedule() {
  const s = await getSnapshot();
  if (!s) { els.scheduleDay.textContent = 'Could not load schedule data.'; return; }
  const { day } = s;
  els.scheduleDay.textContent = day.label;
  const note = day.estimated ? 'Estimated from the usual weekly pattern. Wednesdays and Fridays can differ.'
    : day.source === 'student calendar' ? "From a student calendar, not the school's." : '';
  els.scheduleNote.textContent = note;
  els.scheduleNote.hidden = !note;
  const t = statusText(s);
  els.scheduleNow.textContent = `${t.main}${t.side ? '. ' + t.side : ''}`;
  els.scheduleBlocks.replaceChildren();
  if (!s.blocks.length && s.upcoming) {
    const u = s.upcoming;
    els.scheduleNow.textContent = `Next school day: ${u.dateLabel} · ${u.day.type}` + (u.firstBlock ? ` · ${u.firstBlock.name} at ${fmt(u.firstBlock.start)}` : '');
    return;
  }
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  for (const b of s.blocks) {
    const li = document.createElement('li');
    const [eh, em] = b.end.split(':').map(Number);
    if (s.current && b.name === s.current.name && b.start === s.current.start) li.classList.add('is-now');
    else if (eh * 60 + em <= nowMin) li.classList.add('is-past');
    const name = document.createElement('span'); name.textContent = b.name;
    const tm = document.createElement('span'); tm.className = 't'; tm.textContent = `${fmt(b.start)}–${fmt(b.end)}`;
    li.append(name, tm);
    els.scheduleBlocks.appendChild(li);
  }
}
els.nowbar.addEventListener('click', () => {
  activateTab('tools');
  els.scheduleCard.scrollIntoView({ block: 'start' });
});
setInterval(() => { renderNowbar(); if (!$('#panel-tools').hidden) renderSchedule(); }, 30000);

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
    if (needTerms()) return;
    activateTab('chat');
    sendMessage(TOOL_PROMPTS[btn.dataset.tool] ?? '');
  });
});

/* ---------- Update check ---------- */
let lastUpdate = null;
function renderUpdate(u) {
  lastUpdate = u;
  const { state } = u;
  els.updateBanner.hidden = state !== 'downloaded' && state !== 'available';
  els.updateReload.hidden = state !== 'downloaded';
  els.updateCopy.hidden = state !== 'available';
  if (state === 'downloaded') els.updateText.textContent = `v${u.disk} is downloaded. Reload to finish. The panel will close; open it again.`;
  if (state === 'available') els.updateText.textContent = `v${u.remote} is on GitHub (you have v${u.local}). Run the update command in Terminal; this banner will then offer Reload.`;
  els.updateStatus.textContent = {
    downloaded: `v${u.disk} is downloaded. Reload to finish.`,
    available: `v${u.remote} is available. Run the update command in Terminal, then reload.`,
    error: u.error,
    current: `Up to date (v${u.local}).`,
  }[state] ?? '';
  if (u.releasesUrl) els.releasesLink.href = u.releasesUrl;
}
async function runUpdateCheck(force) {
  if (!force && settings.checkForUpdates === false) { els.updateStatus.textContent = 'Update checks are off.'; return; }
  els.checkNow.disabled = true;
  els.updateStatus.textContent = 'Checking…';
  renderUpdate(await checkForUpdate({ force }));
  els.checkNow.disabled = false;
}
// Quiet re-check: no "Checking…" text, button untouched.
async function backgroundUpdateCheck() {
  if (settings.checkForUpdates === false) return;
  renderUpdate(await checkForUpdate({ force: false }));
}
window.addEventListener('focus', backgroundUpdateCheck);
setInterval(() => { if (lastUpdate?.state === 'available') backgroundUpdateCheck(); }, 15000);
els.updateCopy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastUpdate.command); els.updateCopy.textContent = 'Copied'; } catch { els.updateCopy.textContent = 'Copy failed'; }
  setTimeout(() => (els.updateCopy.textContent = 'Copy command'), 1500);
});
els.updateReload.addEventListener('click', reloadExtension);
els.checkNow.addEventListener('click', () => runUpdateCheck(true));

/* ---------- Chat ---------- */
function scrollToEnd() { els.messages.scrollTop = els.messages.scrollHeight; }
const termsOk = () => settings.termsAccepted === TERMS_VERSION;
function termsDate() {
  const [y, m, d] = TERMS_VERSION.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function renderTermsGate() {
  const ok = termsOk();
  els.gate.hidden = ok;
  els.messages.hidden = !ok;
  els.contextChip.hidden = !ok;
  els.composer.hidden = !ok;
  els.chatHint.hidden = !ok;
  els.termsStatus.textContent = ok ? `You agreed to the terms dated ${termsDate()}.` : 'You have not agreed yet. Open Chat to review and agree.';
  updateChatState();
}
function needTerms() {
  if (termsOk()) return false;
  activateTab('chat');
  els.termsAccept.focus();
  return true;
}
els.termsAccept.addEventListener('click', async () => {
  settings = { ...settings, termsAccepted: TERMS_VERSION };
  await saveSettings(settings);
  renderTermsGate();
  els.input.focus();
});
function updateChatState() {
  const has = !!els.messages.querySelector('.msg');
  els.empty.hidden = has;
  els.chatToolbar.hidden = !has || !termsOk();
}
function actionButton(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn--small';
  b.textContent = label;
  b.addEventListener('click', () => onClick(b));
  return b;
}
function addActions(bubble, ...buttons) {
  const row = document.createElement('div');
  row.className = 'msg__actions';
  row.append(...buttons);
  bubble.append(row);
}
function renderMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg msg--${role}`;
  if (role === 'ai') {
    const body = document.createElement('div');
    body.className = 'md';
    body.append(renderMarkdown(text));
    div.append(body);
    addActions(div, actionButton('Copy', async (b) => {
      try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; } catch { b.textContent = 'Copy failed'; }
      setTimeout(() => (b.textContent = 'Copy'), 1500);
    }));
  } else {
    div.textContent = text;
  }
  els.messages.appendChild(div);
  updateChatState();
  scrollToEnd();
  return div;
}
function renderPending() {
  const div = document.createElement('div');
  div.className = 'msg msg--ai is-pending';
  const dots = document.createElement('span');
  dots.className = 'dots';
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) dots.append(document.createElement('i'));
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = 'Thinking…';
  div.append(dots, sr);
  els.messages.appendChild(div);
  scrollToEnd();
  return div;
}
function renderError(message, needsSettings) {
  const div = document.createElement('div');
  div.className = 'msg msg--error';
  div.setAttribute('role', 'alert');
  const p = document.createElement('div');
  p.textContent = message;
  div.append(p);
  const buttons = [actionButton('Retry', () => { div.remove(); updateChatState(); requestReply(); })];
  if (needsSettings) buttons.push(actionButton('Open Settings', openProviderSettings));
  addActions(div, ...buttons);
  els.messages.appendChild(div);
  updateChatState();
  scrollToEnd();
}
function setBusy(busy) {
  els.send.hidden = busy;
  els.stop.hidden = !busy;
  syncSend();
}
function syncSend() { els.send.disabled = !els.input.value.trim(); }

async function sendMessage(override) {
  const text = (override ?? els.input.value).trim();
  if (!termsOk() || !text || pending) return;
  els.input.value = '';
  autosize();
  syncSend();
  renderMessage('user', text);
  history.push({ role: 'user', text, at: Date.now() });
  await requestReply();
}

async function requestReply() {
  if (pending || !termsOk()) return;
  const controller = new AbortController();
  const state = { controller, bubble: null, userStopped: false, timedOut: false };
  pending = state;
  setBusy(true);
  const timeout = setTimeout(() => { state.timedOut = true; controller.abort(); }, 120000);
  state.bubble = renderPending();
  try {
    const context = settings.includePageContext ? await getPageContext() : null;
    const reply = await generate({ messages: history, context, settings, signal: controller.signal });
    state.bubble.remove();
    renderMessage('ai', reply);
    history.push({ role: 'ai', text: reply, at: Date.now() });
    await saveHistory(history);
  } catch (err) {
    state.bubble.remove();
    if (!state.userStopped) {
      const msg = state.timedOut ? 'Timed out waiting for the model.' : (err?.message ?? String(err));
      const needs = err instanceof ProviderNotConfiguredError || /reach|rejected|passcode|api key|unauthor/i.test(msg);
      renderError(msg, needs);
    }
    await saveHistory(history);
  } finally {
    clearTimeout(timeout);
    pending = null;
    setBusy(false);
    els.input.focus();
  }
}

els.stop.addEventListener('click', () => {
  if (!pending) return;
  pending.userStopped = true;
  pending.controller.abort();
});
els.composer.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
});
function autosize() {
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight, 140) + 'px';
}
els.input.addEventListener('input', () => { autosize(); syncSend(); });
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => { if (!needTerms()) sendMessage(chip.dataset.prompt); });
});

/* ---------- Boot ---------- */
async function boot() {
  els.version.textContent = 'v' + chrome.runtime.getManifest().version;
  settings = await loadSettings();
  history = await loadHistory();
  applyTheme();
  fillSettingsForm();
  renderProviderChip();
  renderTermsGate();
  history.forEach((m) => renderMessage(m.role, m.text));
  updateChatState();
  renderNowbar();
  await refreshContext();
  runUpdateCheck(false);
}
boot();
