// Persistence for the side panel, on chrome.storage.local.
// Settings include the user's own API key (if they chose the Anthropic
// provider). It stays in this browser profile and is never synced or exported.

import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/messages.js';

const HISTORY_CAP = 200;

export async function loadSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] ?? {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function loadHistory() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  const h = data[STORAGE_KEYS.HISTORY];
  return Array.isArray(h) ? h : [];
}

export async function saveHistory(messages) {
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: messages.slice(-HISTORY_CAP) });
}

export async function clearHistory() {
  await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
}
