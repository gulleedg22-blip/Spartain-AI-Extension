// Background service worker (Manifest V3).
// Responsibilities: open the side panel on toolbar click, relay tab changes,
// and answer simple requests from the side panel. Keep it stateless; it can be
// killed by Chrome at any time. Persist anything important in chrome.storage.

import { MSG } from '../shared/messages.js';

// Clicking the toolbar icon opens the side panel for the current window.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

// Tell the side panel when the active tab changes so it can refresh page context.
async function broadcastTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    await chrome.runtime.sendMessage({
      type: MSG.TAB_CHANGED,
      payload: { tabId: tab.id, url: tab.url ?? '', title: tab.title ?? '' },
    });
  } catch {
    // No side panel listening, or the tab is gone. Both are fine.
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => broadcastTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active) broadcastTab(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MSG.PING) {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }
  return false;
});
