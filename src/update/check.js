// Update check for people running the extension unpacked from a git clone.
// Compares the installed version with manifest.json on the main branch.
// Chrome only auto-updates Web Store extensions, so this just tells the
// user to pull and offers a one-click reload.

const MANIFEST_URL = 'https://raw.githubusercontent.com/gulleedg22-blip/Spartain-AI-Extension/main/manifest.json';
const RELEASES_URL = 'https://github.com/gulleedg22-blip/Spartain-AI-Extension/releases/latest';
const INTERVAL_MS = 60 * 60 * 1000;
const KEY = 'spartain.updateCheck';

function newer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0); }
  return false;
}

export async function checkForUpdate({ force = false } = {}) {
  const local = chrome.runtime.getManifest().version;
  const cached = (await chrome.storage.local.get(KEY))[KEY];
  if (!force && cached && Date.now() - cached.at < INTERVAL_MS) {
    return { local, remote: cached.remote, updateAvailable: newer(cached.remote, local), releasesUrl: RELEASES_URL };
  }
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const remote = (await res.json()).version;
  await chrome.storage.local.set({ [KEY]: { at: Date.now(), remote } });
  return { local, remote, updateAvailable: newer(remote, local), releasesUrl: RELEASES_URL };
}

export function reloadExtension() {
  chrome.runtime.reload();
}
