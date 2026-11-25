const invalid = message => Object.assign(new Error(message), { code: 'invalid-argument' });

export function normalizeSlots(slots) {
  const result = [...slots];
  while (result.length % 4 || result.length < 4) result.push(null);
  while (result.length > 4 && result.slice(-4).every(id => id === null)) result.splice(-4);
  return result;
}

export function validateLayout(layout) {
  if (!layout || Object.keys(layout).sort().join(',') !== 'revision,slots' || !Number.isSafeInteger(layout.revision) || layout.revision < 1 || !Array.isArray(layout.slots) || layout.slots.length < 4 || layout.slots.length > 200 || layout.slots.length % 4 || layout.slots.some(id => id !== null && (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)))) throw invalid('Invalid gallery layout.');
  const ids = layout.slots.filter(id => id !== null);
  if (new Set(ids).size !== ids.length) throw invalid('Artwork cannot occupy multiple slots.');
  return layout;
}

export function moveSlot(slots, from, to) {
  validateLayout({ slots, revision: 1 });
  if (!Number.isInteger(from) || from < 0 || from >= slots.length || slots[from] === null || !Number.isInteger(to) || to < 0 || to >= Math.min(slots.length + 4, 200)) throw invalid('Invalid gallery destination.');
  const result = [...slots];
  while (result.length <= to) result.push(null);
  const id = result[from];
  result[from] = null;
  if (result[to] !== null) {
    const next = result.findIndex((value, index) => index > to && value === null);
    if (next >= 0) {
      for (let index = next; index > to; index--) result[index] = result[index - 1];
    } else {
      const previous = from;
      for (let index = previous; index < to; index++) result[index] = result[index + 1];
    }
  }
  result[to] = id;
  return normalizeSlots(result);
}

export function initialLayout(items, category) {
  const slots = items.filter(item => item.category === category).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(item => item.id);
  return validateLayout({ slots: normalizeSlots(slots), revision: 1 });
}
