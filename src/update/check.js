// Update check for people running the extension unpacked from a git clone.
//
// Three versions matter:
//   local   the version Chrome has loaded (chrome.runtime.getManifest())
//   disk    the version in manifest.json in the extension's folder right now
//   remote  the version in manifest.json on the main branch on GitHub
//
// state tells the UI what to offer:
//   'downloaded'  disk is newer than local. The files are already there (someone ran
//                 git pull); reloading the extension applies them. Reload WORKS here.
//   'available'   remote is newer than disk. Reloading would change nothing; the user
//                 must run the update command first.
//   'current'     nothing newer was found.
//   'error'       GitHub could not be read and nothing newer is on disk.
//
// An extension cannot write to its own folder, so it can never download an update
// itself. Chrome only auto-updates Web Store installs. The GitHub check needs the
// repository to be public: raw.githubusercontent.com answers 404 for a private one,
// and the extension must never hold a GitHub token. checkForUpdate() never throws.

const MANIFEST_URL = 'https://raw.githubusercontent.com/gulleedg22-blip/Spartain-AI-Extension/main/manifest.json';
export const RELEASES_URL = 'https://github.com/gulleedg22-blip/Spartain-AI-Extension/releases/latest';
// Matches the install location in the README.
export const UPDATE_COMMAND = 'cd ~ && git -C Spartain-AI-Extension pull --ff-only';
const INTERVAL_MS = 60 * 60 * 1000;
// A failed request (offline, or the panel closed mid-request) is retried sooner, so one
// bad moment cannot hide an update for an hour.
const RETRY_MS = 2 * 60 * 1000;
const KEY = 'spartain.updateCheck';

function newer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0); }
  return false;
}

// The version in the extension's folder. Chrome reads unpacked files from disk on
// request, so this changes as soon as a git pull finishes.
async function diskVersion() {
  try {
    const res = await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' });
    return (await res.json()).version ?? null;
  } catch {
    return null;
  }
}

// Returns { local, disk, remote, state, updateAvailable, checkedAt, error, releasesUrl, command }.
// The disk check runs every call (it is local and instant). GitHub is asked at most once
// an hour unless force is true.
export async function checkForUpdate({ force = false } = {}) {
  const local = chrome.runtime.getManifest().version;
  const disk = await diskVersion();

  let cached = (await chrome.storage.local.get(KEY))[KEY];
  if (force || !cached || Date.now() - cached.at >= (cached.ttl ?? INTERVAL_MS)) {
    const at = Date.now();
    let remote = null, error = null, ttl = INTERVAL_MS;
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (res.status === 404) error = 'GitHub answered 404. The repository may be private or renamed, so the extension cannot see new versions. Update with git pull.';
      else if (!res.ok) error = `GitHub answered ${res.status}.`;
      else remote = (await res.json()).version ?? null;
    } catch (e) {
      error = `Could not reach GitHub (${e.message}).`;
      ttl = RETRY_MS;
    }
    cached = { at, remote, error, ttl };
    await chrome.storage.local.set({ [KEY]: cached });
  }

  const remote = cached.remote ?? null;
  const onDisk = disk ?? local;
  let state = 'current';
  if (newer(onDisk, local)) state = 'downloaded';
  else if (remote && newer(remote, onDisk)) state = 'available';
  else if (cached.error) state = 'error';

  return {
    local, disk: onDisk, remote, state,
    updateAvailable: state === 'downloaded' || state === 'available',
    checkedAt: cached.at, error: cached.error ?? null,
    releasesUrl: RELEASES_URL, command: UPDATE_COMMAND,
  };
}

export function reloadExtension() {
  chrome.runtime.reload();
}
