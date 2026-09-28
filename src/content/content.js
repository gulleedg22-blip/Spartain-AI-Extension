// Content script skeleton. Runs in every http(s) page. Keep it tiny and
// READ-ONLY. NOT IMPLEMENTED YET; left open for contributors.
// Do NOT use import/export here (content scripts are classic scripts in MV3).
//
// Intended job: answer { type: 'GET_PAGE_CONTEXT' } from the side panel with
//   { title: document.title, url: location.href, selection: <selected text> }
// See src/sidepanel/page-context.js for the other half.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_PAGE_CONTEXT') return false;
  // TODO(contributors): read document.title, location.href, window.getSelection()
  sendResponse({ title: '', url: '', selection: '' });
  return false;
});
