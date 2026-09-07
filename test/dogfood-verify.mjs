// Verifies the CI dogfood run of this very action (selftest.yml → job "dogfood").
//
//   node test/dogfood-verify.mjs keyless  — no key: action must exit 0 without scoring
//   node test/dogfood-verify.mjs keyed    — with key: fixture gates/scores must match
//                                           tests/fixtures/v2-baseline-output.txt (±1)
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const mode = process.argv[2] ?? 'keyless';

if (mode === 'keyless') {
  // Graceful path (fork PRs without secrets): notice + exit 0, no outputs, no report.
  if (process.env.QC_PRODUCTION) throw new Error('keyless run must not produce outputs');
  // Only assert report absence in CI: locally a leftover tilesmith-report/ from
  // manual runs would otherwise fail `npm test` (node:test discovers this file).
  if (process.env.CI === 'true') {
    try {
      await readFile('tilesmith-report/report.json', 'utf8');
      throw new Error('keyless run must not write a report');
    } catch (error) {
      if (!/ENOENT/.test(error.message)) throw error;
    }
  }
  console.log('dogfood keyless OK: no key → notice + exit 0');
} else {
  const report = JSON.parse(await readFile('tilesmith-report/report.json', 'utf8'));
  assert.equal(report.stats.total, 6, 'all 6 fixtures scored');

  const find = (suffix) => report.tiles.find((tile) => tile.file.endsWith(suffix));

  const base01 = find('base-01.png');
  assert.ok(base01, 'base-01.png scored');
  assert.equal(base01.gate, 'Production');
  assert.ok(Math.abs(base01.overall - 97) <= 1, `base-01 overall ${base01.overall} within 97±1`);

  const brick = find('brick.png');
  assert.ok(brick, 'brick.png scored');
  assert.ok(Math.abs(brick.overall - 95) <= 1, `brick overall ${brick.overall} within 95±1`);
  if (brick.size_class && brick.size_class !== '?x?') assert.equal(brick.size_class, '64x64', 'brick scored at 64x64');

  const overlays = (await readdir('tilesmith-report')).filter((name) => name.endsWith('.png'));
  assert.equal(overlays.length, report.stats.total, 'one overlay per scored tile');

  console.log(`dogfood keyed OK: ${report.stats.total} tiles scored, avg ${report.stats.avg}`);
}
