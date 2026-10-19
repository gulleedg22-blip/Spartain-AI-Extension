// Message types shared by the side panel, background service worker, and content script.
// Every runtime message is `{ type: MSG.<NAME>, payload?: object }`.
// Add new types here first, then handle them in the relevant script.

export const MSG = Object.freeze({
  // side panel -> content script (via background or tabs.sendMessage)
  GET_PAGE_CONTEXT: 'GET_PAGE_CONTEXT',   // reply: { title, url, selection }

  // side panel -> background
  PING: 'PING',                           // reply: { ok: true, version }

  // background -> side panel
  TAB_CHANGED: 'TAB_CHANGED',             // payload: { tabId, url, title }
});

export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'spartain.settings',
  HISTORY: 'spartain.history',
});

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',        // 'system' | 'light' | 'dark'
  includePageContext: true,
  displayName: '',
  provider: 'local',      // 'local' (Ollama on this machine) | 'anthropic' (user's own key)
  modelEndpoint: 'http://localhost:11434',
  modelName: 'llama3',
  anthropicApiKey: '',    // stored only in chrome.storage.local on this computer
});
