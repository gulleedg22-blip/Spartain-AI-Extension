// What is on the user's current tab: { title, url, selection }.
// Asks the content script; falls back to tab metadata when it is not injected
// (chrome:// pages, the Web Store, tabs opened before the extension was installed).

import { MSG } from '../shared/messages.js';

export async function getPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const fallback = { title: tab?.title ?? '', url: tab?.url ?? '', selection: '' };
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) return fallback;
  try {
    const ctx = await chrome.tabs.sendMessage(tab.id, { type: MSG.GET_PAGE_CONTEXT });
    return { ...fallback, ...(ctx ?? {}) };
  } catch {
    return fallback;
  }
}
