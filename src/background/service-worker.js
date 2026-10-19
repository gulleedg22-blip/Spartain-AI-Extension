// Background service worker (Manifest V3). Stateless; Chrome can kill it any time.
// Jobs: open the side panel on toolbar click, answer PING, relay tab changes.

import { MSG } from '../shared/messages.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

async function broadcastTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    await chrome.runtime.sendMessage({
      type: MSG.TAB_CHANGED,
      payload: { tabId: tab.id, url: tab.url ?? '', title: tab.title ?? '' },
    });
  } catch {
    // No panel open, or the tab is gone.
  }
}
chrome.tabs.onActivated.addListener(({ tabId }) => broadcastTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active) broadcastTab(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MSG.PING) {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
  }
  return false;
});
