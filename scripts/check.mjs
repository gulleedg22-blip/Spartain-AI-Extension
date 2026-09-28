// Sanity checks that run in CI and before pushing. No dependencies.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

let failed = false;
const fail = (msg) => { console.error('✗ ' + msg); failed = true; };
const ok = (msg) => console.log('✓ ' + msg);

// 1. manifest.json parses and points at real files
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (!manifest.side_panel?.default_path) fail('side_panel.default_path missing');
const refs = [
  manifest.side_panel?.default_path,
  manifest.background?.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((c) => c.js ?? []),
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);
for (const r of refs) existsSync(r) ? ok(`exists: ${r}`) : fail(`manifest references missing file: ${r}`);
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) fail(`version "${manifest.version}" is not MAJOR.MINOR.PATCH`);

// 2. every JS file under src/ parses
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}
for (const f of walk('src')) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); ok(`syntax: ${f}`); }
  catch (e) { fail(`syntax error in ${f}\n${e.stderr}`); }
}

// 3. no hex colors outside theme.css
for (const f of walk('src').concat(['src/sidepanel/sidepanel.css', 'src/sidepanel/index.html'])) {
  if (f.endsWith('theme.css')) continue;
  const hits = readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{6}\b/g);
  if (hits) fail(`hex color(s) ${[...new Set(hits)].join(', ')} in ${f}; move to src/shared/theme.css`);
}

// 4. content script must not use ES module syntax
if (/^\s*(import|export)\s/m.test(readFileSync('src/content/content.js', 'utf8'))) fail('content.js must not use import/export');

process.exit(failed ? 1 : 0);
