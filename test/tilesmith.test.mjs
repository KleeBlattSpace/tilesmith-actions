import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { renderOverlay } from '../src/overlay.mjs';
import { aggregate, markdownReport, upsertComment, MARKER } from '../src/report.mjs';
import { matches, globToRegex } from '../src/main.mjs';

const png = (width, height) => PNG.sync.write(new PNG({ width, height }));

test('overlay upscales small source and draws a production frame', () => {
  const output = PNG.sync.read(renderOverlay(png(16, 16), { gate: 'Production', overall: 97 }));
  assert.ok(output.width >= 128 && output.height >= 128);
  assert.deepEqual([...output.data.slice(0, 3)], [46, 160, 67]);
});

test('aggregate counts gates and computes average', () => {
  assert.deepEqual(
    aggregate([
      { gate: 'Production', overall: 97 },
      { gate: 'Review', overall: 80 },
      { gate: 'Reject', overall: 50 },
    ]),
    { total: 3, production: 1, review: 1, reject: 1, avg: 75.7 },
  );
});

test('markdown contains marker, table, disclaimer and upgrade hint', () => {
  const text = markdownReport({ total: 1, avg: 50, production: 0, review: 0, reject: 1 }, [
    { file: 'a.png', overall: 50, gate: 'Reject', size_class: '64x64' },
  ]);
  assert.match(text, new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(text, /\| File \| Score \| Gate \| Size class \|/);
  assert.match(text, /Images and personal data are never stored/);
  assert.match(text, /upgrade/i);
  assert.match(text, /tilesmith\.kleeblatt\.space/);
  assert.match(text, /Account & API Keys/);
  assert.match(text, /✅ Production/);
});

test('scan matcher accepts configured glob prefixes and rejects unrelated paths', () => {
  assert.equal(matches(`${process.cwd()}/assets/hero.png`, ['assets/**']), true);
  assert.equal(matches(`${process.cwd()}/src/hero.png`, ['assets/**']), false);
});

test('glob matcher: ** crosses directories, * stays within one segment', () => {
  const g = (pattern) => globToRegex(pattern);
  assert.equal(g('assets/**').test('assets/a/b/c.png'), true);
  assert.equal(g('assets/**').test('assets2/a.png'), false);
  assert.equal(g('assets/*').test('assets/a.png'), true);
  assert.equal(g('assets/*').test('assets/a/b.png'), false, '* must not cross /');
  assert.equal(g('**/*.png').test('a.png'), true, '**/ also matches zero directories');
  assert.equal(g('**/*.png').test('x/y/a.png'), true);
  assert.equal(g('assets/**/*.png').test('assets/top.png'), true);
  assert.equal(g('assets/**/*.png').test('assets/x/y/top.png'), true);
  assert.equal(g('assets/**/*.png').test('assets/x/y/top.jpg'), false);
  assert.equal(g('assets/**/sub/*.png').test('assets/sub/a.png'), true);
  assert.equal(g('assets/**/sub/*.png').test('assets/deep/sub/a.png'), true);
  assert.equal(g('assets/**/sub/*.png').test('assets/deep/sub/x/a.png'), false);
  assert.equal(g('tiles/?.png').test('tiles/a.png'), true);
  assert.equal(g('tiles/?.png').test('tiles/ab.png'), false);
  assert.equal(g('assets').test('assets/a.png'), true, 'bare directory acts as prefix');
  assert.equal(g('assets').test('assets-other/a.png'), false);
});

test('markdown report collapses long tile lists', () => {
  const tiles = Array.from({ length: 40 }, (_, i) => ({ file: `t${i}.png`, overall: 90, gate: 'Production' }));
  const text = markdownReport({ total: 40, avg: 90, production: 40, review: 0, reject: 0 }, tiles);
  assert.doesNotMatch(text, /t39\.png/);
  assert.match(text, /and 10 more/);
});

test('upsertComment paginates to find its marker comment and patches it', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const method = options?.method ?? 'GET';
    calls.push({ url, method });
    if (method === 'GET') {
      const page = Number(new URL(url, 'https://api.github.com').searchParams.get('page') || 1);
      const pages = [
        [
          { id: 1, body: 'review comment' },
          { id: 2, body: 'another' },
        ],
        [
          { id: 3, body: 'unrelated' },
          { id: 7, body: `old ${MARKER}` },
        ],
      ];
      return new Response(JSON.stringify(pages[page - 1] ?? []), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };
  const ok = await upsertComment({ token: 't', repo: 'o/r', issueNumber: 5, body: 'new', fetchImpl });
  assert.equal(ok, true);
  assert.deepEqual(
    calls.map((call) => call.method),
    ['GET', 'GET', 'PATCH'],
  );
  assert.match(calls.at(-1).url, /\/comments\/7$/);
});
