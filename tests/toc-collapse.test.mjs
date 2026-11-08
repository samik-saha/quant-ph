// Collapsible ToC: each lecture heading gets a hide/show toggle for its clip list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const dataSrc = readFileSync(new URL('../assets/data.js', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');

function makeEnv(pageLecture, storedCollapsed) {
  const store = { 'qm804-done': '[]' };
  if (storedCollapsed !== undefined) store['qm804-nav-collapsed'] = storedCollapsed;
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const toggleBtns = [];
  const navEl = {
    _h: '',
    set innerHTML(v) {
      this._h = v;
      toggleBtns.length = 0;
      for (const m of v.matchAll(/data-toggle="(\d+)"/g)) {
        const btn = {
          dataset: { toggle: m[1] },
          attrs: {},
          setAttribute(k, val) { this.attrs[k] = val; },
          addEventListener(ev, h) { this._click = h; },
        };
        const open = v.match(new RegExp(`data-toggle="${m[1]}"[^>]*aria-expanded="([^"]+)"`));
        if (open) btn.attrs['aria-expanded'] = open[1];
        toggleBtns.push(btn);
      }
    },
    get innerHTML() { return this._h; },
    querySelectorAll: (sel) => (sel === '[data-toggle]' ? toggleBtns : []),
    querySelector: (sel) => {
      if (sel === '#navExpand') return { addEventListener(ev, h) { navEl._expand = h; } };
      if (sel === '#navCollapse') return { addEventListener(ev, h) { navEl._collapse = h; } };
      return null;
    },
  };
  const els = { '#lectureNav': navEl, '#progressBar': { style: {} }, '#progressLabel': { textContent: '' } };
  const document = {
    body: { dataset: pageLecture ? { lecture: String(pageLecture) } : {}, classList: { remove() {}, add() {} } },
    querySelector: (s) => els[s] || null,
    querySelectorAll: () => [],
  };
  const sandbox = { console, localStorage, document, window: {}, MathJax: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(dataSrc, sandbox);
  vm.runInContext(appSrc, sandbox);
  return { sandbox, navEl, toggleBtns, store };
}

test('current lecture starts expanded, others collapsed, each with a toggle', () => {
  const { navEl, toggleBtns } = makeEnv(3);
  assert.equal(toggleBtns.length, 24, 'one toggle per lecture');
  assert.equal((navEl._h.match(/data-lecture="/g) || []).length, 24);
  assert.equal((navEl._h.match(/is-collapsed/g) || []).length, 23);
  const btn3 = toggleBtns.find((b) => b.dataset.toggle === '3');
  const btn5 = toggleBtns.find((b) => b.dataset.toggle === '5');
  assert.equal(btn3.attrs['aria-expanded'], 'true');
  assert.equal(btn5.attrs['aria-expanded'], 'false');
  assert.ok(navEl._h.includes('aria-controls="nav-segs-5"'), 'toggle should point at its section list');
});

test('toggling persists, and expand/collapse-all work', () => {
  const { sandbox, navEl, toggleBtns, store } = makeEnv(3);
  toggleBtns.find((b) => b.dataset.toggle === '5')._click();
  assert.equal(vm.runInContext('navCollapsed.has(5)', sandbox), false);
  assert.ok(!JSON.parse(store['qm804-nav-collapsed']).includes(5), 'expanded lecture saved as not-collapsed');
  navEl._collapse();
  assert.equal(vm.runInContext('navCollapsed.size', sandbox), 24);
  navEl._expand();
  assert.equal(vm.runInContext('navCollapsed.size', sandbox), 0);
  const re = makeEnv(3, store['qm804-nav-collapsed']);
  assert.equal(vm.runInContext('navCollapsed.size', re.sandbox), 0);
});
