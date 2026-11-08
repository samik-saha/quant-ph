// Regression test: redrawing a simulation (e.g. moving a slider) must never
// change the canvas size. The old fit() re-read the canvas height attribute
// after overwriting it, so every redraw grew the diagram and shifted the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../assets/sims.js', import.meta.url), 'utf8');
const sandbox = { devicePixelRatio: 2, console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

function fakeCanvas(cssWidth, baseHeight) {
  const canvas = {
    width: 860,
    height: baseHeight,
    dataset: {},
    style: {},
    getBoundingClientRect: () => ({ width: cssWidth, height: cssWidth * (canvas.dataset.baseH ? Number(canvas.dataset.baseH) : baseHeight) / 860 }),
    getAttribute: (name) => name === 'height' ? String(canvas.height) : null,
    getContext: () => ({ setTransform() {} }),
  };
  return canvas;
}

test('fit() is idempotent: repeated redraws keep the same size', () => {
  const canvas = fakeCanvas(700, 260);
  const first = sandbox.fit(canvas);
  for (let i = 0; i < 10; i++) {
    const again = sandbox.fit(canvas);
    assert.equal(again.w, first.w, `redraw ${i}: width changed`);
    assert.equal(again.h, first.h, `redraw ${i}: height grew/shrank (${first.h} -> ${again.h})`);
  }
  assert.ok(Math.abs(first.h - 700 * 260 / 860) < 0.01, `height should be CSS width x base/860, got ${first.h}`);
});

test('fit() still adapts once when the container genuinely resizes', () => {
  const canvas = fakeCanvas(700, 240);
  const a = sandbox.fit(canvas);
  canvas.getBoundingClientRect = () => ({ width: 350, height: 350 * 240 / 860 });
  const b = sandbox.fit(canvas);
  assert.equal(b.w, 350);
  assert.ok(Math.abs(b.h - 350 * 240 / 860) < 0.01);
  assert.notEqual(a.h, b.h);
});

test('debroglie marker says visible light, and wave stays below labels at narrow width', () => {
  assert.ok(src.includes('visible light'), 'expected a "visible light" marker');
  assert.ok(!src.includes('green light'), 'the red "green light" label should be gone');
  const Sims = vm.runInContext('Sims', sandbox);
  const texts = [], arcs = [], segs = [];
  let strokeStyle = '';
  const ctx = {
    clearRect() {}, beginPath() {}, moveTo(x, y) { segs.push({ s: strokeStyle, y }); },
    lineTo(x, y) { segs.push({ s: strokeStyle, y }); },
    stroke() {}, fill() {}, arc(x, y) { arcs.push(y); },
    fillText(t, x, y) { texts.push({ t: String(t), y }); },
    setTransform() {},
  };
  Object.defineProperty(ctx, 'strokeStyle', { get: () => strokeStyle, set: (v) => { strokeStyle = v; } });
  const cssWidth = 360, baseH = 240;
  const canvas = {
    width: 860, height: baseH, dataset: {}, style: {},
    getBoundingClientRect: () => ({ width: cssWidth, height: cssWidth * baseH / 860 }),
    getAttribute: (name) => (name === 'height' ? String(canvas.height) : null),
    getContext: () => ctx,
  };
  const store = {
    '#ev': { value: '100', dataset: {}, addEventListener() {} },
    '#evOut': { textContent: '' }, '#dbBase': {}, '#dbMsg': { textContent: '' },
    canvas, '.readout': { innerHTML: '' },
  };
  const el = { set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, querySelector: (s) => store[s] || null };
  Sims.debroglie(el);
  const h = cssWidth * baseH / 860;
  assert.ok(texts.length > 0 && segs.length > 0, 'expected the sim to draw text and a wave');
  for (const t of texts) assert.ok(t.y >= 0 && t.y <= h, `"${t.t}" at y=${t.y} escapes h=${h}`);
  const wave = segs.filter((s) => s.s === '#145da0').map((s) => s.y);
  assert.ok(wave.length > 50, 'expected a sampled wave path');
  for (const y of wave) assert.ok(y >= 0 && y <= h, `wave y=${y} escapes h=${h}`);
  const tickY = Math.max(...texts.filter((t) => /nm$|^10|^100/.test(t.t)).map((t) => t.y));
  assert.ok(Math.min(...wave) > tickY, 'wave should stay below the tick labels, not under them');
});
