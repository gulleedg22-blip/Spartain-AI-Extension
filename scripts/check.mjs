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
function walk(dir, exts = ['.js']) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, exts) : exts.some((e) => p.endsWith(e)) ? [p] : [];
  });
}
for (const f of walk('src')) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); ok(`syntax: ${f}`); }
  catch (e) { fail(`syntax error in ${f}\n${e.stderr}`); }
}

// 3. no hex colors outside theme.css
for (const f of walk('src', ['.js', '.css', '.html'])) {
  if (f.endsWith('theme.css')) continue;
  const hits = readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{6}\b/g);
  if (hits) fail(`hex color(s) ${[...new Set(hits)].join(', ')} in ${f}; move to src/shared/theme.css`);
}

// 4. content script must not use ES module syntax
if (/^\s*(import|export)\s/m.test(readFileSync('src/content/content.js', 'utf8'))) fail('content.js must not use import/export');

// 5. every JSON file under src/data parses
for (const f of readdirSync('src/data').filter((n) => n.endsWith('.json'))) {
  try { JSON.parse(readFileSync(join('src/data', f), 'utf8')); ok(`json: src/data/${f}`); }
  catch (e) { fail(`invalid JSON in src/data/${f}: ${e.message}`); }
}

// 5b. the Terms of Use date and TERMS_VERSION must agree, so a terms change always re-prompts users
{
  const version = readFileSync('src/shared/messages.js', 'utf8').match(/TERMS_VERSION = '(\d{4}-\d{2}-\d{2})'/)?.[1];
  const printed = readFileSync('src/legal/terms.md', 'utf8').match(/^Last updated: (.+)$/m)?.[1];
  const iso = printed ? new Date(printed + ' UTC').toISOString().slice(0, 10) : null;
  if (!version || version !== iso) fail(`TERMS_VERSION (${version}) does not match "Last updated: ${printed}" in src/legal/terms.md`);
  else ok(`terms version ${version} matches src/legal/terms.md`);
}

// 6. no API keys or tokens anywhere in tracked files
const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{8,}/,          // Anthropic keys
  /sk-[A-Za-z0-9]{20,}/,               // generic sk- keys
  /gh[pousr]_[A-Za-z0-9]{20,}/,        // GitHub tokens
  /AIza[0-9A-Za-z_-]{30,}/,            // Google API keys
];
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const f of tracked) {
  if (/\.(png|jpg|jpeg|webp|gif|ico|zip)$/i.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const re of SECRET_PATTERNS) {
    if (re.test(text)) fail(`possible secret in ${f} (matches ${re}); remove it and rotate the key`);
  }
}
ok('no secrets in tracked files');

process.exit(failed ? 1 : 0);
