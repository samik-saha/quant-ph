// Lecture 4 last part: a boost sim for L4.2, a stationary-phase panel for
// L4.4, and a candidate-wave sim for L4.6; data.js must wire them up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const simsSrc = readFileSync(new URL('../assets/sims.js', import.meta.url), 'utf8');
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

function recordingCtx(texts) {
  const ctx = {
    strokeStyle: '', fillStyle: '', lineWidth: 1,
    setTransform() {}, clearRect() {}, beginPath() {}, closePath() {},
    stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, setLineDash() {},
    arc() {}, moveTo() {}, lineTo() {},
    fillText(t) { texts.push(String(t)); },
  };
  return ctx;
}

// Fake element whose control stubs are built from the sim's own generated
// HTML (slider values, select options, checkbox state), like a browser.
function simEl(baseH) {
  const texts = [];
  const ctx = recordingCtx(texts);
  const canvas = {
    width: 860, height: baseH, dataset: {}, style: {},
    getBoundingClientRect: () => ({ width: 860, height: baseH }),
    getAttribute: (n) => (n === 'height' ? String(canvas.height) : null),
    getContext: () => ctx,
  };
  const mkInput = (v) => ({
    value: String(v), dataset: {}, _h: null,
    addEventListener(ev, h) { this._h = h; },
    dispatchEvent() { if (this._h) this._h(); return true; },
  });
  const el = {
    dataset: {}, _texts: texts, _store: { canvas, '.readout': { innerHTML: '' } },
    set innerHTML(v) {
      this._h = v;
      for (const m of v.matchAll(/<input type="range" id="(\w+)"[^>]*value="([^"]+)"/g)) {
        this._store['#' + m[1]] = mkInput(m[2]);
        this._store['#' + m[1] + 'Out'] = { textContent: '' };
      }
      for (const m of v.matchAll(/<select id="(\w+)">([\s\S]*?)<\/select>/g)) {
        const first = m[2].match(/value="([^"]+)"/);
        this._store['#' + m[1]] = {
          value: first ? first[1] : '', _h: null,
          addEventListener(ev, h) { this._h = h; },
        };
      }
      for (const m of v.matchAll(/<input type="checkbox" id="(\w+)"( checked)?/g)) {
        this._store['#' + m[1]] = {
          checked: !!m[2], _h: null,
          addEventListener(ev, h) { this._h = h; },
        };
      }
      for (const m of v.matchAll(/<button[^>]*id="(\w+)"/g)) {
        this._store['#' + m[1]] = { textContent: '', onclick: null };
      }
    },
    get innerHTML() { return this._h; },
    querySelector(s) { return this._store[s] || null; },
  };
  return el;
}

function segSim(code) {
  const i = dataSrc.indexOf(`{code:"${code}"`);
  assert.ok(i >= 0, `${code} segment not found`);
  const m = dataSrc.slice(i, i + 4000).match(/sim:"(\w+)"/);
  return m && m[1];
}

test('data.js wires the new sims to L4.2 and L4.6', () => {
  assert.equal(segSim('L4.2'), 'boost');
  assert.equal(segSim('L4.6'), 'freewave');
  assert.equal(segSim('L4.1'), 'debroglie', 'L4.1 keeps its existing sim');
});

test('boost: ordinary wave keeps lambda under a boost, matter wave does not', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  assert.equal(typeof Sims.boost, 'function', 'Sims.boost should exist');
  const el = simEl(260);
  Sims.boost(el);
  assert.equal(env.raf.size, 0, 'boost sim is static: no animation on mount');
  let html = el._store['.readout'].innerHTML;
  assert.match(html, /λ′ \(moving\) <b>4\.00<\/b>/, `ordinary wave: lambda unchanged at V=0.4: ${html}`);
  assert.match(html, /ω′\/ω <b>0\.600<\/b>/, `ordinary wave: frequency shifts by 1-V: ${html}`);

  const sel = el._store['#boostMode'];
  sel.value = 'matter';
  sel._h({ target: sel });
  html = el._store['.readout'].innerHTML;
  assert.match(html, /λ′ \(moving\) <b>6\.67<\/b>/, `matter wave: lambda stretches by 1/(1-V): ${html}`);
  assert.match(html, /ω′\/ω <b>0\.360<\/b>/, `matter wave: E~p^2 so omega scales as (1-V)^2: ${html}`);
});

test('wavepacket L4.4 preset draws the stationary-phase panel; L4.3 does not', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  const el44 = simEl(340);
  Sims.wavepacket(el44, 'L4.4');
  const joined44 = el44._texts.join('\n');
  assert.match(joined44, /φ\(k\)/, 'L4.4 should show the weight function phi(k)');
  assert.match(joined44, /stationary/, 'L4.4 should label the stationary point');
  assert.match(joined44, /d\/dk/, 'L4.4 should show the phase derivative');

  const el43 = simEl(340);
  Sims.wavepacket(el43, 'L4.3');
  assert.doesNotMatch(el43._texts.join('\n'), /stationary/, 'L4.3 keeps the beat panel');
});

test('freewave: sine standing wave vanishes everywhere at wt=90deg, exponential does not', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  assert.equal(typeof Sims.freewave, 'function', 'Sims.freewave should exist');
  const el = simEl(300);
  Sims.freewave(el, 'L4.6');
  assert.equal(env.raf.size, 0, 'freewave starts paused');
  assert.equal(env.timers.size, 0, 'freewave starts paused (no timeout armed)');

  const wt = el._store['#wt'];
  wt.value = '90';
  wt.dispatchEvent(); // scrub to omega t = 90 degrees, both-movers on by default

  const cand = el._store['#fwCand'];
  cand.value = 'sin';
  cand._h({ target: cand });
  let html = el._store['.readout'].innerHTML;
  assert.match(html, /max \|ψ\|² <b>0\.00/, `sine mixture should vanish everywhere at wt=90: ${html}`);
  assert.match(html, /disappears|vanishes/i, `verdict should call out the disappearance: ${html}`);

  cand.value = 'exp';
  cand._h({ target: cand });
  html = el._store['.readout'].innerHTML;
  assert.match(html, /max \|ψ\|² <b>4\.00/, `exponential mixture keeps |psi|^2 = 4cos^2(kx): ${html}`);
  assert.doesNotMatch(html, /disappears/i, `exponential should not be flagged as disappearing: ${html}`);
});
