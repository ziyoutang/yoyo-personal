import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, moveSlot, normalizeSlots, validateLayout } from '../public/gallery-layout.js';

const invalid = error => error.code === 'invalid-argument';
test('empty slot moves leave the source empty without compacting gaps', () => {
  const slots = ['a', null, 'b', null];
  assert.deepEqual(moveSlot(slots, 0, 3), [null, null, 'b', 'a']);
  assert.deepEqual(slots, ['a', null, 'b', null]);
});
test('occupied targets insert forward when possible and backward toward the origin otherwise', () => {
  assert.deepEqual(moveSlot(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(moveSlot(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveSlot(['a', 'b', 'c', null], 0, 1), [null, 'a', 'b', 'c']);
  assert.deepEqual(moveSlot(['a', null, 'b', 'c'], 0, 3), [null, 'b', 'c', 'a']);
});
test('cross page moves retain intermediate gaps and trim only empty trailing pages', () => {
  assert.deepEqual(moveSlot(['a', 'b', 'c', 'd'], 0, 7), [null, 'b', 'c', 'd', null, null, null, 'a']);
  assert.deepEqual(moveSlot([null, null, null, null, null, null, null, 'a'], 7, 0), ['a', null, null, null]);
  assert.deepEqual(normalizeSlots(['a', null, null, null, null, null, null, null, 'b']), ['a', null, null, null, null, null, null, null, 'b', null, null, null]);
  assert.deepEqual(normalizeSlots([]), [null, null, null, null]);
});
test('initial layouts preserve order including hidden artwork with stable ID tie breaking', () => {
  const items = [{ id: 'c', order: 2, category: 'Art' }, { id: 'b', order: 0, category: 'Art', visible: false }, { id: 'a', order: 0, category: 'Art' }, { id: 'd', order: 0, category: 'Other' }];
  assert.deepEqual(initialLayout(items, 'Art'), { slots: ['a', 'b', 'c', null], revision: 1 });
  assert.deepEqual(initialLayout(items, 'Empty'), { slots: [null, null, null, null], revision: 1 });
});
test('malformed layouts and invalid movement cannot produce invalid placements', () => {
  for (const layout of [null, { slots: [], revision: 1 }, { slots: ['a', 'a', null, null], revision: 1 }, { slots: [1, null, null, null], revision: 1 }, { slots: [null, null, null, null], revision: 0 }, { slots: Array(204).fill(null), revision: 1 }]) assert.throws(() => validateLayout(layout), invalid);
  for (const [from, to] of [[1, 0], [0, 8], [-1, 0], [0, 1.5]]) assert.throws(() => moveSlot(['a', null, null, null], from, to), invalid);
  assert.throws(() => moveSlot(['a', ...Array(199).fill(null)], 0, 200), invalid);
});
test('every insertion keeps membership exactly once for all source/destination pairs', () => {
  for (const slots of [['a', 'b', 'c', 'd'], ['a', null, 'c', 'd'], ['a', null, 'c', null, null, 'd', null, null]]) {
    slots.forEach((id, from) => { if (id !== null) for (let to = 0; to < slots.length + 4; to++) {
      const result = moveSlot(slots, from, to);
      validateLayout({ slots: result, revision: 1 });
      assert.deepEqual(result.filter(Boolean).sort(), slots.filter(Boolean).sort());
      assert.equal(result[to], id);
    } });
  }
});
