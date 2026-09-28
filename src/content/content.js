// Content script. Runs in every page. Keep it tiny and read-only:
// its only job is to answer "what is on this page?" for the side panel.
// Do NOT import modules here (content scripts are classic scripts in MV3).

const GET_PAGE_CONTEXT = 'GET_PAGE_CONTEXT';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== GET_PAGE_CONTEXT) return false;
  const selection = window.getSelection()?.toString().trim() ?? '';
  sendResponse({
    title: document.title,
    url: location.href,
    selection: selection.slice(0, 5000),
  });
  return false;
});
