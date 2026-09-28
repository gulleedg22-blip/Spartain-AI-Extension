// Background service worker (Manifest V3).
// Only job right now: make the toolbar icon open the side panel.
// Stateless by design; Chrome can kill it at any time. Persist with chrome.storage.
//
// Open for contributors (see docs/ROADMAP.md):
// - Broadcast MSG.TAB_CHANGED to the side panel on chrome.tabs.onActivated /
//   onUpdated so the panel can refresh page context.
// - Answer MSG.PING with { ok: true, version } for the header status dot.

import { MSG } from '../shared/messages.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MSG.PING) {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
  }
  return false;
});
