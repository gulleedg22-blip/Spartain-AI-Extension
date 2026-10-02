#!/usr/bin/env node
// Load the extension in headless Chromium and screenshot the side panel page.
//
//   node .claude/skills/sidepanel-ui/scripts/screenshot.mjs --out DIR [--tab chat|tools|settings]
//        [--dark] [--width 380] [--height 640] [--send "message text"]
//
// Prints the extension id, header status, and console errors. Writes
// DIR/panel-<tab>-<light|dark>.png. Needs Playwright with Chromium
// (`npx playwright install chromium` once). Run from the repo root.

import { mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const flag = (name) => args.includes(name);

const out = resolve(opt('--out', 'screenshots'));
const tab = opt('--tab', 'chat');
const dark = flag('--dark');
const width = Number(opt('--width', 380));
const height = Number(opt('--height', 640));
const send = opt('--send', null);
const ext = resolve(opt('--ext', process.cwd()));

if (!existsSync(join(ext, 'manifest.json'))) {
  console.error(`No manifest.json in ${ext}. Run from the repo root or pass --ext <dir>.`);
  process.exit(1);
}

// Playwright may be a local dependency or a global install.
async function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return await import(pathToFileURL(req.resolve('playwright')).href); } catch { /* fall through */ }
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return import(pathToFileURL(join(globalRoot, 'playwright', 'index.mjs')).href);
}

const { chromium } = await loadPlaywright();
mkdirSync(out, { recursive: true });

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'sp-ui-')), {
  headless: true,
  channel: 'chromium',
  colorScheme: dark ? 'dark' : 'light',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;
  console.log('extension id:', id);

  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setViewportSize({ width, height });
  await page.goto(`chrome-extension://${id}/src/sidepanel/index.html`);
  await page.waitForTimeout(500);

  if (send) {
    await page.fill('#input', send);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
  }
  if (tab !== 'chat') {
    await page.click(`[data-tab="${tab}"]`);
    await page.waitForTimeout(300);
  }

  const file = join(out, `panel-${tab}-${dark ? 'dark' : 'light'}.png`);
  await page.screenshot({ path: file });
  console.log('status:', await page.getAttribute('#status', 'class'));
  console.log('errors:', errors.length ? errors.join('\n  ') : 'none');
  console.log('wrote', file);
  if (errors.length) process.exitCode = 2;
} finally {
  await ctx.close();
}
