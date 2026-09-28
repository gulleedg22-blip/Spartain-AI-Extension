// Persistence boundary for the side panel. NOT IMPLEMENTED YET; left open
// for contributors. Use chrome.storage.local (never localStorage). Keys are
// in src/shared/messages.js (STORAGE_KEYS). See docs/ROADMAP.md.
//
// Contract the UI relies on:
//   loadSettings() -> Promise<Settings>       merged over DEFAULT_SETTINGS
//   saveSettings(settings) -> Promise<void>
//   loadHistory() -> Promise<Message[]>       [{ role, text, at }]
//   saveHistory(messages) -> Promise<void>    cap the size (e.g. last 200)
//   clearHistory() -> Promise<void>

import { DEFAULT_SETTINGS } from '../shared/messages.js';

export async function loadSettings() {
  // TODO(contributors): read STORAGE_KEYS.SETTINGS from chrome.storage.local
  return { ...DEFAULT_SETTINGS };
}

// eslint-disable-next-line no-unused-vars
export async function saveSettings(settings) {
  // TODO(contributors)
}

export async function loadHistory() {
  // TODO(contributors): read STORAGE_KEYS.HISTORY
  return [];
}

// eslint-disable-next-line no-unused-vars
export async function saveHistory(messages) {
  // TODO(contributors)
}

export async function clearHistory() {
  // TODO(contributors)
}
