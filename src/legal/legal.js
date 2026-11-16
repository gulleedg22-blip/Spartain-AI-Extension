// Legal page: shows src/legal/terms.md or ai-disclaimer.md, rendered by the safe Markdown renderer.
import { STORAGE_KEYS } from '../shared/messages.js';
import { renderMarkdown } from '../sidepanel/markdown.js';

const DOCS = ['terms', 'ai-disclaimer'];
const requested = new URLSearchParams(location.search).get('doc');
const doc = DOCS.includes(requested) ? requested : 'terms';

document.getElementById(`nav-${doc}`).setAttribute('aria-current', 'page');

async function applyTheme() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const theme = data[STORAGE_KEYS.SETTINGS]?.theme;
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch { /* keep the system theme */ }
}

async function load() {
  const title = document.getElementById('doc-title');
  const article = document.getElementById('doc');
  try {
    const res = await fetch(chrome.runtime.getURL(`src/legal/${doc}.md`));
    if (!res.ok) throw new Error(String(res.status));
    const lines = (await res.text()).split(/\r?\n/);
    const i = lines.findIndex((l) => l.startsWith('# '));
    if (i >= 0) {
      title.textContent = lines[i].slice(2).trim();
      lines.splice(i, 1);
    }
    document.title = `${title.textContent || 'Spartan AI'} · Spartan AI`;
    article.replaceChildren(renderMarkdown(lines.join('\n'), { headingLevel: 2 }));
  } catch {
    article.textContent = 'Could not load this document.';
  }
}

applyTheme();
load();
