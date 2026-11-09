// Animations must stay paused by default (no CPU on page load) and must not
// run indefinitely: after ANIM_TIMEOUT_MS a playing sim auto-pauses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../assets/sims.js', import.meta.url), 'utf8');

function makeEnv() {
  const raf = new Map(); // id -> callback
  const timers = new Map(); // id -> {fn, ms}
  let nextId = 1;
  const sandbox = {
    console,
    devicePixelRatio: 1,
    Event: class { constructor(type) { this.type = type; } },
    requestAnimationFrame: (fn) => { const id = nextId++; raf.set(id, fn); return id; },
    cancelAnimationFrame: (id) => { raf.delete(id); },
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { sandbox, raf, timers };
}

function stubCtx() {
  return new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : () => {}),
    set: (o, k, v) => { o[k] = v; return true; },
  });
}

function fakeEl(selectors) {
  const canvas = {
    width: 860, height: 240, dataset: {}, style: {},
    getBoundingClientRect: () => ({ width: 860, height: 240 }),
    getAttribute: (n) => (n === 'height' ? String(canvas.height) : null),
    getContext: () => stubCtx(),
  };
  const store = { canvas, '.readout': { innerHTML: '' }, ...selectors };
  return {
    set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; },
    querySelector: (s) => store[s] || null,
    _store: store,
  };
}

function input(value) {
  return {
    value: String(value), dataset: {}, _h: null,
    addEventListener(ev, h) { this._h = h; },
    dispatchEvent() { if (this._h) this._h(); return true; },
  };
}

function mountWavepacket(env) {
  const play = { textContent: '', onclick: null };
  const el = fakeEl({
    '#k0': input(1.6), '#k0Out': { textContent: '' },
    '#dk': input(0.35), '#dkOut': { textContent: '' },
    '#spread': { checked: true, addEventListener(ev, h) { this._h = h; } },
    '#wpPlay': play,
  });
  vm.runInContext('Sims', env.sandbox).wavepacket(el);
  return { el, play };
}

function mountPhasor(env) {
  const play = { textContent: '', onclick: null };
  const el = fakeEl({
    '#theta': input(40), '#thetaOut': { textContent: '' },
    '#playPh': play,
  });
  vm.runInContext('Sims', env.sandbox).phasor(el);
  return { el, play };
}

function runFrames(env, n) {
  for (let i = 0; i < n; i++) {
    const pending = [...env.raf.values()];
    env.raf.clear();
    for (const fn of pending) fn(16 * (i + 1));
  }
}

test('wavepacket is paused by default: no frames or timers scheduled on mount', () => {
  const env = makeEnv();
  const { el, play } = mountWavepacket(env);
  assert.equal(env.raf.size, 0, 'mount must not schedule requestAnimationFrame');
  assert.equal(env.timers.size, 0, 'mount must not start the animation');
  assert.match(el.innerHTML, /id="wpPlay">▶ Play</, 'play button should invite playing, not pausing');
  assert.ok(play.textContent === '' || play.textContent.includes('▶'), 'button must not show Pause while paused');
});

test('phasor is paused by default: no frames or timers scheduled on mount', () => {
  const env = makeEnv();
  mountPhasor(env);
  assert.equal(env.raf.size, 0);
  assert.equal(env.timers.size, 0);
});

test('playing runs frames, pausing stops them, and the timeout auto-pauses', () => {
  const env = makeEnv();
  const { el, play } = mountWavepacket(env);
  const timeoutMs = vm.runInContext('ANIM_TIMEOUT_MS', env.sandbox);
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 120000,
    `expected a bounded auto-pause timeout, got ${timeoutMs}`);

  // Start: frames are scheduled and a single auto-pause timer is armed.
  play.onclick();
  assert.equal(env.raf.size, 1, 'play should schedule a frame');
  assert.equal(env.timers.size, 1, 'play should arm the auto-pause timeout');
  assert.equal([...env.timers.values()][0].ms, timeoutMs);
  runFrames(env, 3);
  const tWhilePlaying = el._store['.readout'].innerHTML;
  assert.match(tWhilePlaying, /t <b>0\.[^<]+<\/b>/, 'time should advance while playing');

  // Timeout fires: animation auto-pauses and the button flips back to Play.
  const [timer] = [...env.timers.values()];
  env.timers.clear();
  timer.fn();
  assert.equal(env.raf.size, 0, 'timeout must cancel the pending frame');
  assert.ok(play.textContent.includes('▶'), `button should show Play after timeout, got "${play.textContent}"`);
  runFrames(env, 3);
  assert.equal(el._store['.readout'].innerHTML, tWhilePlaying, 'time must not advance after auto-pause');

  // Restarting works, and a manual pause disarms the timeout.
  play.onclick();
  assert.equal(env.timers.size, 1, 'replay should re-arm the timeout');
  play.onclick();
  assert.equal(env.timers.size, 0, 'manual pause should clear the timeout');
  assert.equal(env.raf.size, 0, 'manual pause should cancel the pending frame');
});

test('phasor animation also auto-pauses on the timeout', () => {
  const env = makeEnv();
  const { play } = mountPhasor(env);
  play.onclick();
  assert.equal(env.timers.size, 1, 'play should arm the auto-pause timeout');
  const [timer] = [...env.timers.values()];
  env.timers.clear();
  timer.fn();
  assert.equal(env.raf.size, 0, 'timeout must stop the phasor animation');
  assert.ok(play.textContent.includes('▶'), `button should show Rotate again, got "${play.textContent}"`);
});
