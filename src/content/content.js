// Content script. Runs in every http(s) page. Read-only: answers
// "what is on this page?" for the side panel. Classic script, no imports.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_PAGE_CONTEXT') return false;
  const selection = (window.getSelection()?.toString() ?? '').trim().slice(0, 5000);
  sendResponse({ title: document.title, url: location.href, selection });
  return false;
});
