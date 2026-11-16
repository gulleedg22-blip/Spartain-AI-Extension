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

// Date of the current Terms of Use (src/legal/terms.md). Change it whenever the terms change;
// the side panel then asks every user to agree again before chatting.
export const TERMS_VERSION = '2026-11-16';

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',        // 'system' | 'light' | 'dark'
  includePageContext: true,
  checkForUpdates: true,
  showZeroPeriod: false,
  termsAccepted: '',      // TERMS_VERSION the user agreed to, or '' if never  // show 0 period (7:15) in the schedule
  displayName: '',
  provider: 'local',      // 'local' (Ollama) | 'anthropic' (user's own key) | 'proxy' (team proxy + passcode)
  modelEndpoint: 'http://localhost:11434',
  modelName: 'llama3',
  anthropicModel: 'claude-sonnet-5-5', // used by the 'anthropic' and 'proxy' providers
  anthropicApiKey: '',    // stored only in chrome.storage.local on this computer
  proxyUrl: '',           // e.g. https://spartan-proxy.yourname.workers.dev
  proxyPasscode: '',
});
