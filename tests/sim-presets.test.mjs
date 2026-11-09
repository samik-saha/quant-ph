// Segment-aware presets: app.js must hand each sim its segment code, and the
// wavepacket must start from defaults suited to that clip (e.g. L4.5's rigid
// motion means spreading OFF, L7.5's free evolution means spreading ON).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const simsSrc = readFileSync(new URL('../assets/sims.js', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const dataSrc = readFileSync(new URL('../assets/data.js', import.meta.url), 'utf8');

function makeEnv() {
  const raf = new Map(), timers = new Map();
  let nextId = 1;
  const sandbox = {
    console, devicePixelRatio: 1,
    Event: class { constructor(t) { this.type = t; } },
    requestAnimationFrame: (fn) => { const id = nextId++; raf.set(id, fn); return id; },
    cancelAnimationFrame: (id) => { raf.delete(id); },
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
  };
  vm.createContext(sandbox);
  vm.runInContext(simsSrc, sandbox);
  return { sandbox, raf, timers };
}

const stubCtx = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : () => {}),
  set: (o, k, v) => { o[k] = v; return true; },
});
const input = (v) => ({
  value: String(v), dataset: {}, _h: null,
  addEventListener(ev, h) { this._h = h; },
  dispatchEvent() { if (this._h) this._h(); return true; },
});

function wavepacketEl(presetK0 = 1.6, presetDk = 0.35) {
  const canvas = {
    width: 860, height: 340, dataset: {}, style: {},
    getBoundingClientRect: () => ({ width: 860, height: 340 }),
    getAttribute: (n) => (n === 'height' ? String(canvas.height) : null),
    getContext: () => stubCtx(),
  };
  // Slider stubs start at whatever value the generated HTML asked for, like a
  // browser would: parse them lazily from the sim's own markup.
  const el = {
    dataset: {},
    _store: { canvas, '.readout': { innerHTML: '' }, '#wpPlay': { textContent: '', onclick: null } },
    set innerHTML(v) {
      this._h = v;
      const val = (id, dflt) => {
        const m = v.match(new RegExp(`id="${id}"[^>]*value="([^"]+)"`));
        return m ? m[1] : dflt;
      };
      this._store['#k0'] = input(val('k0', presetK0));
      this._store['#k0Out'] = { textContent: '' };
      this._store['#dk'] = input(val('dk', presetDk));
      this._store['#dkOut'] = { textContent: '' };
      this._store['#spread'] = {
        checked: /id="spread" checked/.test(v),
        addEventListener(ev, h) { this._h = h; },
      };
    },
    get innerHTML() { return this._h; },
    querySelector(s) { return this._store[s] || null; },
  };
  return el;
}

function runFrames(env, n) {
  for (let i = 0; i < n; i++) {
    const pending = [...env.raf.values()];
    env.raf.clear();
    for (const fn of pending) fn();
  }
}
const sigma = (el) => parseFloat(el._store['.readout'].innerHTML.match(/envelope width σ <b>([\d.]+)/)[1]);

test('L4.5 preset: spreading off by default, so the packet moves rigidly', () => {
  const env = makeEnv();
  const el = wavepacketEl();
  vm.runInContext('Sims', env.sandbox).wavepacket(el, 'L4.5');
  assert.equal(el._store['#spread'].checked, false, 'L4.5 checkbox should start unchecked');
  assert.match(el.innerHTML, /Preset for L4\.5/, 'preset should be explained in the caption');
  const s0 = sigma(el);
  el._store['#wpPlay'].onclick();
  runFrames(env, 100);
  assert.equal(sigma(el), s0, `rigid motion: sigma should stay ${s0}, got ${sigma(el)}`);
});

test('L4.3 and L4.4 presets: spreading off; L4.4 uses a narrower dk', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  const el43 = wavepacketEl();
  Sims.wavepacket(el43, 'L4.3');
  assert.equal(el43._store['#spread'].checked, false);
  const el44 = wavepacketEl();
  Sims.wavepacket(el44, 'L4.4');
  assert.equal(el44._store['#spread'].checked, false);
  assert.match(el44.innerHTML, /id="dk"[^>]*value="0\.25"/, 'L4.4 should start with dk=0.25');
  assert.equal(sigma(el44), 8, 'sigma0 should follow from dk=0.25 (2/0.25)');
});

test('L7.5 preset and unknown segments: spreading on (free packet broadens)', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  const el75 = wavepacketEl();
  Sims.wavepacket(el75, 'L7.5');
  assert.equal(el75._store['#spread'].checked, true);
  const s0 = sigma(el75);
  el75._store['#wpPlay'].onclick();
  runFrames(env, 100);
  assert.ok(sigma(el75) > s0, 'L7.5 packet should broaden while playing');

  const elDefault = wavepacketEl();
  Sims.wavepacket(elDefault); // no segment: previous defaults preserved
  assert.equal(elDefault._store['#spread'].checked, true);
  assert.match(elDefault.innerHTML, /id="dk"[^>]*value="0\.35"/);
});

test('app.js passes the segment code through to the sim (end to end)', () => {
  const simEl = wavepacketEl();
  simEl.dataset = { sim: 'wavepacket', seg: 'L4.5' };
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const document = {
    body: { dataset: {}, classList: { remove() {}, add() {} } },
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === '[data-sim]' ? [simEl] : []),
  };
  const sandbox = {
    console, localStorage, document, MathJax: null,
    devicePixelRatio: 1,
    Event: class { constructor(t) { this.type = t; } },
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
    setTimeout: () => 1, clearTimeout: () => {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(dataSrc, sandbox);
  vm.runInContext(simsSrc, sandbox);
  vm.runInContext(appSrc, sandbox);
  assert.match(simEl.innerHTML, /Preset for L4\.5/, 'app-mounted L4.5 sim should receive its segment and apply the preset');
  assert.equal(simEl._store['#spread'].checked, false);
});
