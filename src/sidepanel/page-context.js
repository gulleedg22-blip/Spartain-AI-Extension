// Page-context boundary: what is on the user's current tab.
// NOT IMPLEMENTED YET; left open for contributors. See docs/ROADMAP.md.
//
// Contract the UI relies on:
//   getPageContext() -> Promise<{ title: string, url: string, selection: string }>
//
// Intended design: query the active tab with chrome.tabs.query, then
// chrome.tabs.sendMessage(tabId, { type: MSG.GET_PAGE_CONTEXT }) to the
// content script in src/content/content.js, which answers with the title,
// URL, and selected text. Fall back to tab.title / tab.url when the content
// script is not injected (chrome:// pages, tabs opened before install).
// Wrap sendMessage in try/catch; the receiver may not exist.

export async function getPageContext() {
  // TODO(contributors)
  return { title: '', url: '', selection: '' };
}
