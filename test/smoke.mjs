// End-to-end smoke test for dist/index.mjs (not part of the unit test suite).
// Spawns the bundled action against a local mock API with a clean environment.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const dist = new URL('../dist/index.mjs', import.meta.url).pathname;
const fixtures = new URL('../tests/fixtures/', import.meta.url).pathname;

const scores = [
  [/^119,/, { overall: 97, gate: 'Production', size_class: '16x16' }], // base-01.png
  [/^1900142,/, { overall: 95, gate: 'Production', scored_at: '64x64' }], // brick.png
  [/.*/, { overall: 62, gate: 'Reject' }],
];

const server = createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    const fingerprint = `${buf.length},`;
    const hit = scores.find(([re]) => re.test(fingerprint));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(hit[1]));
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const run = (env, cwd) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [dist], {
      env: { PATH: process.env.PATH, NODE_NO_WARNINGS: '1', ...env },
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });

// --- workspace: assets/ (deep), other/ (must be ignored by glob) ---
const ws = '/tmp/qc-smoke-ws';
rmSync(ws, { recursive: true, force: true });
mkdirSync(`${ws}/assets/nested`, { recursive: true });
mkdirSync(`${ws}/other`, { recursive: true });
cpSync(`${fixtures}/base-01.png`, `${ws}/assets/base-01.png`);
cpSync(`${fixtures}/brick.png`, `${ws}/assets/nested/brick.png`);
cpSync(`${fixtures}/grass.png`, `${ws}/assets/dup-name.png`);
cpSync(`${fixtures}/dirt.png`, `${ws}/other/dirt.png`);
cpSync(`${fixtures}/base-02.png`, `${ws}/assets/dup_name.png`);
cpSync(`${fixtures}/base-03.png`, `${ws}/assets/nested_x.png`);
cpSync(`${fixtures}/base-02.png`, `${ws}/assets/nested/x.png`); // collides with nested_x.png after sanitizing

// --- 1) keyless: notice + exit 0, no report ---
let r = await run(
  { GITHUB_WORKSPACE: ws, INPUT_PATHS: 'assets/**', GITHUB_STEP_SUMMARY: '/tmp/qc-smoke-summary.md' },
  ws,
);
assert.equal(r.status, 0, `keyless must exit 0, got ${r.status}\n${r.stdout}${r.stderr}`);
assert.match(r.stdout, /::notice::No API key/);
assert.ok(!readdirSync(ws).includes('tilesmith-report'), 'keyless must not write a report');
console.log('1) keyless: notice + exit 0 ✓');

// --- 2) keyed: scores via mock, respects glob scope, writes overlays/report/outputs ---
const outFile = '/tmp/qc-smoke-output.txt';
rmSync(outFile, { force: true });
r = await run(
  {
    GITHUB_WORKSPACE: ws,
    INPUT_API_KEY: 'ts_smoke',
    INPUT_PATHS: 'assets/**',
    INPUT_FAIL_ON: 'never',
    TILESMITH_API_URL: `${base}/v1/score`,
    TILESMITH_REPORTS_URL: `${base}/v1/reports`,
    GITHUB_OUTPUT: outFile,
    GITHUB_STEP_SUMMARY: '/tmp/qc-smoke-summary.md',
  },
  ws,
);
assert.equal(r.status, 0, `keyed run failed: ${r.stdout}${r.stderr}`);
assert.doesNotMatch(r.stdout, /ts_smoke/, 'API key must never be logged');

const report = JSON.parse(readFileSync(`${ws}/tilesmith-report/report.json`, 'utf8'));
assert.equal(report.action_version, '1.1.0');
assert.equal(report.stats.total, 6, 'only assets/** scored, not other/');
assert.ok(
  report.tiles.every((t) => t.file.startsWith('assets/')),
  'glob scope respected',
);
const overlays = readdirSync(`${ws}/tilesmith-report`).filter((f) => f.endsWith('.png'));
assert.equal(overlays.length, 6, 'one overlay per tile, collisions resolved');
assert.ok(
  overlays.includes('assets_nested_x.png') && overlays.includes('assets_nested_x-2.png'),
  `collision suffixing: ${overlays.join(', ')}`,
);

const outputs = Object.fromEntries(
  readFileSync(outFile, 'utf8')
    .trim()
    .split('\n')
    .map((l) => l.split('=')),
);
assert.equal(outputs.production, '2');
assert.equal(outputs.reject, '4');
assert.equal(outputs.review, '0');
assert.equal(outputs.skipped, '0');
assert.equal(outputs.avg, '73.3');
console.log('2) keyed: scoring, glob scope, collision-safe overlays, outputs ✓');

// --- 3) max-files notice + fail-on gate ---
rmSync(`${ws}/tilesmith-report`, { recursive: true, force: true });
r = await run(
  {
    GITHUB_WORKSPACE: ws,
    INPUT_API_KEY: 'ts_smoke',
    INPUT_PATHS: 'assets/**',
    INPUT_FAIL_ON: 'Reject',
    INPUT_MAX_FILES: '2',
    TILESMITH_API_URL: `${base}/v1/score`,
    GITHUB_OUTPUT: outFile,
  },
  ws,
);
assert.equal(r.status, 1, 'fail-on: Reject must exit 1 when a Reject tile was scored');
assert.match(r.stdout, /max-files limit/);
console.log('3) fail-on gate exits 1, max-files notice ✓');

server.close();
console.log('\nSMOKE OK');
