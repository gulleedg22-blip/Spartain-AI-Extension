// What is on the user's current tab: { title, url, selection }.
//
// First asks the content script. That fails on tabs that were already open when the
// extension was installed or last reloaded (their content script is missing or orphaned),
// so it then reads the page directly with chrome.scripting. Pages Chrome does not let
// extensions touch (chrome://, the Web Store, PDFs) fall back to the tab's title and URL.

import { MSG } from '../shared/messages.js';

// Runs inside the web page. Must be self-contained: no outside variables.
function readPage() {
  return {
    title: document.title,
    url: location.href,
    selection: (window.getSelection()?.toString() ?? '').trim().slice(0, 5000),
  };
}

export async function contextForTab(tab) {
  const fallback = { title: tab?.title ?? '', url: tab?.url ?? '', selection: '' };
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) return fallback;
  try {
    const ctx = await chrome.tabs.sendMessage(tab.id, { type: MSG.GET_PAGE_CONTEXT });
    if (ctx) return { ...fallback, ...ctx };
  } catch { /* no live content script in this tab; read the page directly below */ }
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
    if (res?.result) return { ...fallback, ...res.result };
  } catch { /* a page extensions cannot read */ }
  return fallback;
}

export async function getPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return contextForTab(tab);
}
