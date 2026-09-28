// Package the extension for the Chrome Web Store. Uses the system `zip`.
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

mkdirSync('dist', { recursive: true });
rmSync('dist/spartain-ai.zip', { force: true });
execFileSync('zip', ['-r', 'dist/spartain-ai.zip', 'manifest.json', 'assets', 'src', '-x', '*.DS_Store'], { stdio: 'inherit' });
console.log('Wrote dist/spartain-ai.zip');
