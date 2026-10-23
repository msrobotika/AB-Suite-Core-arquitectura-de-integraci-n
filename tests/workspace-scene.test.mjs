import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blankProject,
  newWidget,
  validateProject,
  TYPES
} from '../apps/scada/src/hmi-model.js';
test('HMI scene: every original vector and signal component has valid geometry', () => {
  for (const type of TYPES) {
    const p = blankProject();
    p.screens[0].widgets.push(newWidget(type));
    const w = validateProject(p).screens[0].widgets[0];
    assert.equal(w.type, type);
    assert.ok(w.width >= 40 && w.height >= 30);
  }
});
test('HMI scene: old v1 card projects migrate without modifying their input', () => {
  const p = blankProject();
  for (let i = 0; i < 30; i++) {
    const w = newWidget('value');
    for (const key of [
      'x',
      'y',
      'width',
      'height',
      'fill',
      'stroke',
      'strokeWidth',
      'min',
      'max',
      'direction'
    ])
      delete w[key];
    p.screens[0].widgets.push(w);
  }
  const q = validateProject(p);
  assert.equal(q.screens[0].width, 1600);
  assert.equal(p.screens[0].width, undefined);
  assert.equal(p.screens[0].widgets[0].x, undefined);
  assert.equal(q.screens[0].widgets[29].y, 815);
  assert.equal(q.screens[0].widgets.length, 30);
});
test('HMI scene: malformed and out-of-bounds geometry cannot replace a valid project', () => {
  const p = validateProject(blankProject());
  p.screens[0].widgets.push(newWidget('tank'));
  for (const [key, value] of [
    ['x', -1],
    ['y', 1000],
    ['width', 2000],
    ['height', 0],
    ['strokeWidth', 0],
    ['max', 0],
    ['min', Infinity],
    ['fill', 'url(https://external)'],
    ['direction', 'script']
  ]) {
    const q = structuredClone(p);
    q.screens[0].widgets[0][key] = value;
    assert.throws(() => validateProject(q), key);
  }
  assert.doesNotThrow(() => validateProject(p));
});
test('HMI scene: screen size, background, duplicate IDs and project limits are validated', () => {
  const p = validateProject(blankProject());
  for (const [key, value] of [
    ['width', 639],
    ['height', 2161],
    ['width', 1600.5],
    ['background', 'red']
  ]) {
    const q = structuredClone(p);
    q.screens[0][key] = value;
    assert.throws(() => validateProject(q), key);
  }
  for (let i = 0; i < 31; i++) p.screens[0].widgets.push(newWidget('ellipse'));
  assert.throws(() => validateProject(p), /30/);
});
test('HMI scene: layout, layer order, styles and scale survive a JSON round trip', () => {
  const p = validateProject(blankProject());
  const w = newWidget('tank');
  Object.assign(w, {
    x: 360,
    y: 120,
    width: 240,
    height: 360,
    min: -20,
    max: 80,
    fill: '#324456',
    stroke: '#ff9da7'
  });
  p.screens[0].widgets.push(w, newWidget('pipe'));
  const q = validateProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(q, p);
  q.screens[0].widgets.reverse();
  assert.equal(q.screens[0].widgets[1].id, w.id);
  assert.equal(q.screens[0].widgets[1].min, -20);
});

test('HMI scene: navigation references a real screen and rejects deletion of its target', () => {
  const p = validateProject(blankProject());
  p.screens.push({ id: 'target-screen', name: 'Destino', widgets: [] });
  const w = newWidget('navigation');
  w.targetScreen = 'target-screen';
  p.screens[0].widgets.push(w);
  assert.doesNotThrow(() => validateProject(p));
  p.screens.pop();
  assert.throws(() => validateProject(p), /destino/);
});
