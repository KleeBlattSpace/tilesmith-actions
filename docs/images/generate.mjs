// Generates the real overlay example images used in README/docs.
// Run: node docs/images/generate.mjs  (uses the actual src/overlay.mjs)
import { readFile, writeFile } from 'node:fs/promises';
import { renderOverlay } from '../../src/overlay.mjs';

const cases = [
  ['base-01.png', 'overlay-production.png', { gate: 'Production', overall: 97, size_class: '16x16' }],
  ['base-02.png', 'overlay-review.png', { gate: 'Review', overall: 78, size_class: '16x16' }],
  ['base-03.png', 'overlay-reject.png', { gate: 'Reject', overall: 42, size_class: '16x16' }],
];

for (const [fixture, out, score] of cases) {
  const input = await readFile(new URL(`../../tests/fixtures/${fixture}`, import.meta.url));
  await writeFile(new URL(`./${out}`, import.meta.url), renderOverlay(input, score));
  console.log(`wrote ${out} (${score.gate})`);
}
