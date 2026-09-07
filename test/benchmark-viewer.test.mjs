import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dir = new URL('../benchmark-viewer/', import.meta.url);
const read = async (name) => readFile(new URL(name, dir), 'utf8');

test('benchmark viewer snapshot is intact and well-formed', async () => {
  const results = JSON.parse(await read('snapshot/results.json'));
  assert.ok(Array.isArray(results.tiles) && results.tiles.length >= 100, 'snapshot has a full tile set');
  const categories = new Set(results.tiles.map((tile) => tile.category));
  assert.deepEqual(
    [...categories].sort(),
    ['blur', 'border', 'broken_seam', 'pattern', 'perfect', 'watermark'],
    'six defect categories present',
  );
  for (const tile of results.tiles) {
    assert.equal(typeof tile.tile_id, 'string', `${tile.tile_id ?? '?'} has an id`);
    assert.equal(typeof tile.score, 'number');
    assert.ok(['Production', 'Review', 'Reject'].includes(tile.gate), `${tile.tile_id} gate`);
  }
  const truth = JSON.parse(await read('snapshot/ground-truth.json'));
  for (const tile of results.tiles.slice(0, 10)) assert.ok(truth[tile.tile_id], `ground truth for ${tile.tile_id}`);
});

test('viewer app is syntactically valid and consistent with the snapshot', async () => {
  const app = await read('app.js');
  assert.doesNotThrow(() => new Function(app), 'app.js parses as JavaScript');
  for (const category of ['blur', 'border', 'broken_seam', 'pattern', 'perfect', 'watermark'])
    assert.ok(app.includes(`${category}:`), `app.js knows category ${category}`);
  assert.ok(app.includes('snapshot/results.json'), 'app.js has the offline fallback');
  const html = await read('index.html');
  assert.match(html, /app\.js/);
  assert.match(html, /style\.css/);
  assert.doesNotMatch(html, /<script>[^<]/, 'no inline scripts (CSP-friendly)');
});
