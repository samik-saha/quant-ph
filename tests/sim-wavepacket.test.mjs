// Correctness: wavepacket spreading rate + normalisation, v_ph labelling,
// loop-time consistency, and de Broglie crest spacing proportional to lambda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../assets/sims.js', import.meta.url), 'utf8');

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
  vm.runInContext(src, sandbox);
  return { sandbox, raf, timers };
}

function recordingCtx(points) {
  const ctx = {
    strokeStyle: '', fillStyle: '', lineWidth: 1,
    setTransform() {}, clearRect() {}, beginPath() {}, closePath() {},
    stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, setLineDash() {},
    arc() {}, fillText() {},
    moveTo(x, y) { points.push({ x, y, s: ctx.strokeStyle }); },
    lineTo(x, y) { points.push({ x, y, s: ctx.strokeStyle }); },
  };
  return ctx;
}

function fakeEl(selectors, baseH, points) {
  const ctx = recordingCtx(points);
  const canvas = {
    width: 860, height: baseH, dataset: {}, style: {},
    getBoundingClientRect: () => ({ width: 860, height: baseH }),
    getAttribute: (n) => (n === 'height' ? String(canvas.height) : null),
    getContext: () => ctx,
  };
  const store = { canvas, '.readout': { innerHTML: '' }, ...selectors };
  return {
    set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; },
    querySelector: (s) => store[s] || null, _store: store,
  };
}

const input = (v) => ({
  value: String(v), dataset: {}, _h: null,
  addEventListener(ev, h) { this._h = h; },
  dispatchEvent() { if (this._h) this._h(); return true; },
});

function mountWavepacket(env, { k0 = 1.6, dk = 0.35 } = {}) {
  const points = [];
  const play = { textContent: '', onclick: null };
  const el = fakeEl({
    '#k0': input(k0), '#k0Out': { textContent: '' },
    '#dk': input(dk), '#dkOut': { textContent: '' },
    '#spread': { checked: true, addEventListener(ev, h) { this._h = h; } },
    '#wpPlay': play,
  }, 340, points);
  vm.runInContext('Sims', env.sandbox).wavepacket(el);
  return { el, play, points };
}

function runFrames(env, n) {
  for (let i = 0; i < n; i++) {
    const pending = [...env.raf.values()];
    env.raf.clear();
    for (const fn of pending) fn();
  }
}

const readoutNum = (el, labelRe) => {
  const m = el._store['.readout'].innerHTML.match(labelRe);
  assert.ok(m, `readout missing ${labelRe}: ${el._store['.readout'].innerHTML}`);
  return parseFloat(m[1]);
};

test('spreading follows sigma(t)=sqrt(sigma0^2+(t/2sigma0)^2), not (dk*t)^2', () => {
  const env = makeEnv();
  const { el, play } = mountWavepacket(env);
  const s0 = 2 / 0.35;
  play.onclick();
  runFrames(env, 100); // t = 100 * 0.06 = 6
  const sig = readoutNum(el, /envelope width σ <b>([\d.]+)/);
  const expected = Math.sqrt(s0 * s0 + (6 / (2 * s0)) ** 2);
  assert.ok(Math.abs(sig - expected) < 0.02, `sigma=${sig}, expected ${expected.toFixed(3)} (old formula gives 6.09)`);
});

test('spreading lowers the envelope peak so total probability is conserved', () => {
  const env = makeEnv();
  const { el, play, points } = mountWavepacket(env, { dk: 0.9 });
  const spreadBox = el._store['#spread'];
  const h = 340, yB = h * 0.74;
  const peakHeight = () => {
    const ys = points.filter((p) => p.s === '#0f766e' && p.y > h * 0.5).map((p) => p.y);
    assert.ok(ys.length > 10, 'expected bottom envelope points');
    return yB - Math.min(...ys);
  };
  play.onclick();
  runFrames(env, 200); // t = 12, packet centre well inside the view
  play.onclick(); // pause at the same instant / same centre for both draws
  points.length = 0;
  el._store['#k0'].dispatchEvent(); // redraw with spreading on
  const withSpread = peakHeight();
  points.length = 0;
  spreadBox._h({ target: { checked: false } }); // redraw rigid (sigma = sigma0)
  const rigid = peakHeight();
  assert.ok(withSpread < rigid - 1, `envelope peak should fall as packet spreads: rigid ${rigid.toFixed(2)} vs spread ${withSpread.toFixed(2)}`);
});

test('v_ph readout is k0/2, with the beat carrier velocity labelled separately', () => {
  const env = makeEnv();
  // Extreme sliders expose the difference: beat carrier = 0.469, k0/2 = 0.300.
  const { el } = mountWavepacket(env, { k0: 0.6, dk: 0.9 });
  const html = el._store['.readout'].innerHTML;
  assert.match(html, /v_ph = k₀\/2 <b>0\.300<\/b>/, `v_ph should be k0/2: ${html}`);
  assert.match(html, /carrier[^<]*<b>0\.469<\/b>/, `beat carrier velocity should be labelled as such: ${html}`);
});

test('loop resets the clock: displayed t never exceeds one packet cycle', () => {
  const env = makeEnv();
  const { el, play } = mountWavepacket(env);
  play.onclick();
  runFrames(env, 400); // 24 time units; cycle is 32/1.6 = 20
  const t = readoutNum(el, /<div>t <b>([\d.]+)<\/b>/);
  assert.ok(t < 20, `displayed t=${t} should have wrapped with the packet (cycle 20), so sigma does not silently reset`);
});

test('de Broglie crest spacing is proportional to lambda', () => {
  const spacing = (eV) => {
    const env = makeEnv();
    const points = [];
    const el = fakeEl({
      '#ev': input(eV), '#evOut': { textContent: '' },
      '#dbBase': {}, '#dbMsg': { textContent: '' },
    }, 240, points);
    vm.runInContext('Sims', env.sandbox).debroglie(el);
    const wave = points.filter((p) => p.s === '#145da0');
    assert.ok(wave.length > 50, 'expected a wave path');
    const troughs = [];
    for (let i = 1; i < wave.length - 1; i++) {
      if (wave[i].y >= wave[i - 1].y && wave[i].y > wave[i + 1].y) troughs.push(wave[i].x);
    }
    assert.ok(troughs.length >= 3, `expected several crests at ${eV} eV, got ${troughs.length}`);
    const gaps = troughs.slice(1).map((x, i) => x - troughs[i]);
    return gaps.reduce((a, b) => a + b, 0) / gaps.length;
  };
  const ratio = spacing(1) / spacing(100); // lambda ratio is sqrt(100) = 10
  assert.ok(Math.abs(ratio - 10) < 1.5, `crest spacing ratio 1eV/100eV should be ~10, got ${ratio.toFixed(2)}`);
});
