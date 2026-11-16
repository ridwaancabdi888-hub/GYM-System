import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/Toast.jsx', import.meta.url),
  'utf8'
);

test('toast messages expose appropriate live-region semantics', () => {
  assert.match(source, /role=\{t\.type === 'error' \? 'alert' : 'status'\}/);
  assert.match(source, /aria-atomic="true"/);
});

test('toast messages can be dismissed with an accessible control', () => {
  assert.match(source, /onClick=\{\(\) => remove\(t\.id\)\}/);
  assert.match(source, /aria-label=\{`Dismiss \$\{t\.type\} notification`\}/);
  assert.match(source, /<span aria-hidden="true">×<\/span>/);
});

test('toast timers are cleared after dismissal and provider cleanup', () => {
  assert.match(source, /timers\.current\.get\(id\)/);
  assert.match(source, /timers\.current\.forEach\(\(timer\) => clearTimeout\(timer\)\)/);
  assert.match(source, /timers\.current\.clear\(\)/);
});
