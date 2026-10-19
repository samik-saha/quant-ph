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
