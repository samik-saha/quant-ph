// Dark mode: every page carries the toggle and a pre-paint theme init,
// app.js persists the choice, and style.css defines a dark palette.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const css = readFileSync(new URL('../assets/style.css', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const dataSrc = readFileSync(new URL('../assets/data.js', import.meta.url), 'utf8');
const root = new URL('../', import.meta.url);
const pages = readdirSync(root).filter((f) => f.endsWith('.html')).sort();

test('all 25 pages have a theme toggle and pre-paint theme init', () => {
  assert.equal(pages.length, 25, `expected 25 html pages, got ${pages.length}`);
  for (const p of pages) {
    const html = readFileSync(new URL(p, root), 'utf8');
    assert.match(html, /data-theme-toggle/, `${p} should have a theme toggle button`);
    assert.match(html, /qm804-theme/, `${p} should read the saved theme before first paint`);
    assert.match(html, /dataset\.theme/, `${p} should set data-theme on <body> inline`);
    assert.ok(html.indexOf('qm804-theme') < html.indexOf('assets/app.js'), `${p} theme init must run before app.js`);
  }
});

test('style.css defines a dark palette scoped to data-theme="dark"', () => {
  assert.match(css, /body\[data-theme="dark"\]\s*\{[^}]*--bg:/, 'dark mode should override the background variable');
  assert.match(css, /body\[data-theme="dark"\]\s*\{[^}]*--paper:/, 'dark mode should override the surface variable');
  assert.match(css, /body\[data-theme="dark"\]\s*\{[^}]*--ink:/, 'dark mode should override the ink variable');
  assert.match(css, /color-scheme:\s*dark/, 'dark mode should opt native controls into dark color-scheme');
  assert.match(css, /\.theme-btn/, 'toggle button should be styled');
});

function makeEnv(stored) {
  const store = { 'qm804-done': '[]', ...(stored || {}) };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const themeBtn = {
    textContent: '', attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(ev, h) { this._click = h; },
  };
  const document = {
    body: { dataset: {}, classList: { remove() {}, add() {} } },
    querySelector: () => null,
    querySelectorAll: (s) => (s === '[data-theme-toggle]' ? [themeBtn] : []),
  };
  const sandbox = { console, localStorage, document, window: { matchMedia: () => ({ matches: false }) }, MathJax: null };
  sandbox.window = { ...sandbox.window, localStorage };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc, sandbox);
  vm.runInContext(appSrc, sandbox);
  return { sandbox, themeBtn, store };
}

test('app.js applies the saved theme and the toggle persists the flipped choice', () => {
  const dark = makeEnv({ 'qm804-theme': 'dark' });
  assert.equal(vm.runInContext('document.body.dataset.theme', dark.sandbox), 'dark', 'saved dark theme should be applied on load');
  assert.equal(dark.themeBtn.attrs['aria-pressed'], 'true', 'toggle should report pressed in dark mode');
  dark.themeBtn._click();
  assert.equal(vm.runInContext('document.body.dataset.theme', dark.sandbox), 'light', 'toggle should flip to light');
  assert.equal(dark.store['qm804-theme'], 'light', 'toggle choice should persist to localStorage');

  const light = makeEnv({});
  assert.equal(vm.runInContext('document.body.dataset.theme', light.sandbox), 'light', 'no saved theme + no dark system preference should default to light');
  light.themeBtn._click();
  assert.equal(light.store['qm804-theme'], 'dark', 'toggling from light should persist dark');
});
