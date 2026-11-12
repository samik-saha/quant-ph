// Lecture 5: quiz-key correctness, Born-rule notation, checkpoint coverage,
// and the per-segment simulations (operator, Schrödinger-equation checker,
// commutator, Born sampler).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const simsSrc = readFileSync(new URL('../assets/sims.js', import.meta.url), 'utf8');
const dataSrc = readFileSync(new URL('../assets/data.js', import.meta.url), 'utf8');

function loadData() {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc + ';this.__L=LECTURES;this.__Q=QUIZZES;', sandbox);
  return sandbox;
}
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
  return {
    strokeStyle: '', fillStyle: '', lineWidth: 1,
    setTransform() {}, clearRect() {}, beginPath() {}, closePath() {},
    stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, setLineDash() {},
    arc() {}, moveTo() {}, lineTo() {},
    fillText(t) { texts.push(String(t)); },
  };
}
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
        this._store['#' + m[1]] = { value: first ? first[1] : '', _h: null, addEventListener(ev, h) { this._h = h; } };
      }
      for (const m of v.matchAll(/<input type="checkbox" id="(\w+)"( checked)?/g)) {
        this._store['#' + m[1]] = { checked: !!m[2], _h: null, addEventListener(ev, h) { this._h = h; } };
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
function seg(code) {
  const { __L } = loadData();
  const L5 = __L.find((l) => l.id === 5);
  return L5.segments.find((s) => s.code === code);
}

test('L5.2 quiz: inserting a plane wave is keyed to the dispersion relation, not speed c', () => {
  const { __Q } = loadData();
  const q = __Q['L5.2'][1];
  assert.doesNotMatch(q.opts[q.a], /speed.*c/, `marked answer must not claim speed c: ${q.opts[q.a]}`);
  assert.match(q.opts[q.a], /frequency|k\^2|ratio/i, `marked answer should state the omega-k link: ${q.opts[q.a]}`);
});

test('every Lecture 5 segment has a checkpoint, including L5.5', () => {
  const { __L, __Q } = loadData();
  const L5 = __L.find((l) => l.id === 5);
  for (const s of L5.segments) {
    assert.ok((__Q[s.code] || []).length >= 1, `${s.code} should have at least one checkpoint question`);
  }
  assert.ok((__Q['L5.5'] || []).length >= 2, 'L5.5 (Born rule) needs two checkpoint questions');
});

test('L5.5 Born rule is stated as a density times dx, with no doubled dx', () => {
  const s = seg('L5.5');
  const eqs = s.equations.map((e) => e[1]).join(' ');
  assert.doesNotMatch(eqs, /P\(x,t\)\\,dx = \|\\Psi\(x,t\)\|\^2\\,dx/, `Born rule must not carry dx on both sides: ${eqs}`);
  assert.match(eqs, /rho|\\rho/, 'Born rule should name the probability density');
  const summary = s.summary.join(' ');
  assert.doesNotMatch(summary, /collaps/i, 'L5.5 should not import collapse language before measurement is defined');
  assert.match(summary, /e\|\\Psi\|\^2|charge density/i, 'Schrödinger picture should be the charge density e|Psi|^2');
});

test('L5.3 commutator is framed as operator order, and the Hamiltonian is named', () => {
  const s = seg('L5.3');
  assert.doesNotMatch(s.summary.join(' '), /measuring one and then the other/i, 'commutator is not a measurement sequence');
  assert.match(s.summary.join(' ') + s.equations.map((e) => e[1]).join(' '), /hat\{H\}|\\hat H/, 'L5.3 should name the Hamiltonian');
});

test('data.js wires Lecture 5 sims to their segments', () => {
  assert.equal(seg('L5.1').sim, 'operator');
  assert.equal(seg('L5.2').sim, 'schrodcheck');
  assert.equal(seg('L5.3').sim, 'commutator');
  assert.equal(seg('L5.5').sim, 'born');
});

test('schrodcheck: residual vanishes only on omega = k^2/2 (units hbar=m=1)', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  assert.equal(typeof Sims.schrodcheck, 'function', 'Sims.schrodcheck should exist');
  const el = simEl(300);
  Sims.schrodcheck(el, 'L5.2');
  assert.equal(env.raf.size, 0, 'schrodcheck starts paused/static');
  let html = el._store['.readout'].innerHTML;
  assert.match(html, /residual[^<]*<b>-?0\.28<\/b>/, `default k=1.2, omega=1.00 should miss by -0.28: ${html}`);
  el._store['#scSnap'].onclick();
  html = el._store['.readout'].innerHTML;
  assert.match(html, /residual[^<]*<b>0\.00<\/b>/, `snapped omega should satisfy the equation: ${html}`);
  assert.match(html, /satisfies/, `verdict should confirm the equation holds: ${html}`);
});

test('operator: plane wave is an eigenfunction with eigenvalue hbar*k', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  assert.equal(typeof Sims.operator, 'function', 'Sims.operator should exist');
  const el = simEl(280);
  Sims.operator(el, 'L5.1');
  const html = el._store['.readout'].innerHTML;
  assert.match(html, /ħk|hbar\*k|p̂ψ/, `readout should state the momentum eigenvalue: ${html}`);
  assert.match(html, /1\.20/, `default k=1.2 should appear in the readout: ${html}`);
});

test('commutator: (xp - px)f coincides with i*hbar*f for a Gaussian test function', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  assert.equal(typeof Sims.commutator, 'function', 'Sims.commutator should exist');
  const el = simEl(280);
  Sims.commutator(el, 'L5.3');
  const html = el._store['.readout'].innerHTML;
  assert.match(html, /max difference[^<]*<b>0\.000<\/b>/, `the two curves should coincide: ${html}`);
});

test('born: detections accumulate and a global phase leaves |Psi|^2 unchanged', () => {
  const env = makeEnv();
  const Sims = vm.runInContext('Sims', env.sandbox);
  assert.equal(typeof Sims.born, 'function', 'Sims.born should exist');
  const el = simEl(300);
  Sims.born(el, 'L5.5');
  el._store['#born500'].onclick();
  let html = el._store['.readout'].innerHTML;
  assert.match(html, /detections <b>500<\/b>/, `500 detections should be counted: ${html}`);
  const peakBefore = html.match(/peak \|Ψ\|² <b>([\d.]+)<\/b>/);
  assert.ok(peakBefore, `readout should report peak density: ${html}`);
  const th = el._store['#bornTheta'];
  th.value = '120';
  th.dispatchEvent();
  html = el._store['.readout'].innerHTML;
  const peakAfter = html.match(/peak \|Ψ\|² <b>([\d.]+)<\/b>/);
  assert.equal(peakAfter && peakAfter[1], peakBefore[1], 'multiplying by e^{i theta} must not change |Psi|^2');
});
