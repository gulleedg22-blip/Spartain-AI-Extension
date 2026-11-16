// Update check for people running the extension unpacked.
// Compares the installed version with manifest.json on the main branch on GitHub.
// Chrome only auto-updates Web Store extensions, so this can only tell the user
// that a newer version exists and offer a one-click reload after they pull.
//
// IMPORTANT: this needs the GitHub repository to be PUBLIC. raw.githubusercontent.com
// answers 404 for a private repository, and the extension must never hold a GitHub token.
// When that happens checkForUpdate() returns { error } instead of throwing, so the UI
// can say why no update was found.

const MANIFEST_URL = 'https://raw.githubusercontent.com/gulleedg22-blip/Spartain-AI-Extension/main/manifest.json';
export const RELEASES_URL = 'https://github.com/gulleedg22-blip/Spartain-AI-Extension/releases/latest';
const INTERVAL_MS = 60 * 60 * 1000;
const KEY = 'spartain.updateCheck';

function newer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0); }
  return false;
}

// Returns { local, remote, updateAvailable, checkedAt, error, releasesUrl }.
// remote is null and error is a sentence when the check could not be done. Never throws.
export async function checkForUpdate({ force = false } = {}) {
  const local = chrome.runtime.getManifest().version;
  const result = (remote, checkedAt, error = null) => ({
    local, remote, updateAvailable: remote ? newer(remote, local) : false, checkedAt, error, releasesUrl: RELEASES_URL,
  });

  const cached = (await chrome.storage.local.get(KEY))[KEY];
  if (!force && cached && Date.now() - cached.at < INTERVAL_MS) return result(cached.remote ?? null, cached.at, cached.error ?? null);

  const at = Date.now();
  let remote = null, error = null;
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (res.status === 404) error = 'GitHub answered 404. The repository may be private or renamed, so the extension cannot see new versions. Update with git pull.';
    else if (!res.ok) error = `GitHub answered ${res.status}.`;
    else remote = (await res.json()).version ?? null;
  } catch (e) {
    error = `Could not reach GitHub (${e.message}).`;
  }
  await chrome.storage.local.set({ [KEY]: { at, remote, error } });
  return result(remote, at, error);
}

export function reloadExtension() {
  chrome.runtime.reload();
}
