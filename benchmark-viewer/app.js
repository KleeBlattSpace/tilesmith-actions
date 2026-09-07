// TileSmith QC — benchmark viewer (static, no build step).
// Live data: fetched from the public gc-pipeline-benchmark repo (raw.githubusercontent).
// Fallback: bundled snapshot/ copy so the page always renders, even offline.
'use strict';

const LIVE_BASE = 'https://raw.githubusercontent.com/KleeBlattSpace/gc-pipeline-benchmark/main/public/benchmark';
const GATE_ORDER = ['Production', 'Review', 'Reject'];
const GATE_COLOR = { Production: 'var(--green)', Review: 'var(--yellow)', Reject: 'var(--red)' };
const CATEGORY_INFO = {
  perfect: { label: 'Perfect', hint: 'clean reference tile' },
  blur: { label: 'Blur', hint: 'lost detail from down/upscaling' },
  border: { label: 'Border', hint: 'unintended rim around the tile' },
  broken_seam: { label: 'Broken seam', hint: 'edges do not line up when tiled' },
  pattern: { label: 'Pattern', hint: 'visible regular repetition' },
  watermark: { label: 'Watermark', hint: 'stray overlay/text artifact' },
};

const state = { results: null, truth: {}, source: '—', cat: 'all', gate: 'all', size: 'all', sort: 'score-desc' };

const $ = (sel) => document.querySelector(sel);

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadData() {
  try {
    const [results, truth] = await Promise.all([
      fetchJson(`${LIVE_BASE}/results.json`, 8000),
      fetchJson(`${LIVE_BASE}/ground-truth.json`, 8000),
    ]);
    state.source = 'live';
    return { results, truth };
  } catch {
    const [results, truth] = await Promise.all([
      fetchJson('snapshot/results.json', 4000),
      fetchJson('snapshot/ground-truth.json', 4000),
    ]);
    state.source = 'snapshot';
    return { results, truth };
  }
}

function tileImageUrl(tileId) {
  return state.source === 'live' ? `${LIVE_BASE}/dataset/${tileId}` : null;
}

function tiles() {
  return state.results?.tiles ?? [];
}

function currentTiles() {
  let list = tiles().filter((tile) => {
    if (state.cat !== 'all' && tile.category !== state.cat) return false;
    if (state.gate !== 'all' && tile.gate !== state.gate) return false;
    if (state.size !== 'all' && !tile.tile_id.startsWith(`${state.size}/`)) return false;
    return true;
  });
  const by = {
    'score-desc': (a, b) => b.score - a.score || a.tile_id.localeCompare(b.tile_id),
    'score-asc': (a, b) => a.score - b.score || a.tile_id.localeCompare(b.tile_id),
    name: (a, b) => a.tile_id.localeCompare(b.tile_id),
  }[state.sort];
  return list.sort(by);
}

function renderBadge() {
  const badge = $('#source-badge');
  badge.textContent =
    state.source === 'live' ? '● live data — gc-pipeline-benchmark' : '◌ offline snapshot (benchmark repo unreachable)';
  badge.classList.toggle('live', state.source === 'live');
  badge.title =
    state.source === 'live'
      ? 'Fetched directly from the public benchmark repo'
      : 'Bundled copy; numbers may lag the benchmark repo';
  if (state.results?.generated_at)
    $('#generated-at').textContent = `results generated ${state.results.generated_at.slice(0, 10)}`;
}

function renderSummary() {
  const summary = state.results?.summary ?? {};
  const gates = summary.gates ?? {};
  const total = summary.tile_count ?? tiles().length;
  const accuracy = summary.accuracy ?? 0;
  const parts = {
    tiles: `<div class="stat"><div class="value">${total}</div><div class="label">tiles scored</div></div>`,
    accuracy: `<div class="stat"><div class="value">${Math.round(accuracy * 100)}%</div><div class="label">gate accuracy vs. ground truth</div></div>`,
    cats: `<div class="stat"><div class="value">6</div><div class="label">defect categories</div></div>`,
  };
  const bar = GATE_ORDER.map((gate) => {
    const width = total ? ((gates[gate] ?? 0) / total) * 100 : 0;
    return `<div style="width:${width}%;background:${GATE_COLOR[gate]}" title="${gate}: ${gates[gate] ?? 0}"></div>`;
  }).join('');
  const legend = GATE_ORDER.map(
    (gate) =>
      `<span><span class="dot" style="background:${GATE_COLOR[gate]}"></span>${gate} ${gates[gate] ?? 0}</span>`,
  ).join('');
  $('#summary').innerHTML =
    Object.values(parts).join('') + `<div class="gatebar">${bar}</div><div class="gate-legend">${legend}</div>`;
}

function renderControls() {
  const cats = ['all', ...Object.keys(CATEGORY_INFO)];
  const catCounts = {};
  for (const tile of tiles()) catCounts[tile.category] = (catCounts[tile.category] ?? 0) + 1;
  const catButtons = cats
    .map((cat) => {
      const label = cat === 'all' ? `All (${tiles().length})` : `${CATEGORY_INFO[cat].label} (${catCounts[cat] ?? 0})`;
      return `<button data-cat="${cat}" class="${state.cat === cat ? 'active' : ''}" title="${cat === 'all' ? '' : CATEGORY_INFO[cat].hint}">${label}</button>`;
    })
    .join('');
  const gateButtons = ['all', ...GATE_ORDER]
    .map(
      (gate) =>
        `<button data-gate="${gate}" class="${state.gate === gate ? 'active' : ''}">${gate === 'all' ? 'any gate' : gate}</button>`,
    )
    .join('');
  const sizeButtons = ['all', '16x16', '64x64']
    .map(
      (size) =>
        `<button data-size="${size}" class="${state.size === size ? 'active' : ''}">${size === 'all' ? 'all sizes' : size}</button>`,
    )
    .join('');
  $('#controls').innerHTML =
    `${catButtons}<span class="dim">|</span>${gateButtons}<span class="dim">|</span>${sizeButtons}
    <select id="sort" aria-label="Sort">
      <option value="score-desc" ${state.sort === 'score-desc' ? 'selected' : ''}>score ↓</option>
      <option value="score-asc" ${state.sort === 'score-asc' ? 'selected' : ''}>score ↑</option>
      <option value="name" ${state.sort === 'name' ? 'selected' : ''}>name</option>
    </select>`;
  $('#controls')
    .querySelectorAll('button')
    .forEach((button) =>
      button.addEventListener('click', () => {
        const { cat, gate, size } = button.dataset;
        if (cat) state.cat = cat;
        if (gate) state.gate = gate;
        if (size) state.size = size;
        renderControls();
        renderGrid();
      }),
    );
  $('#sort').addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderGrid();
  });
}

function renderGrid() {
  const list = currentTiles();
  $('#empty').hidden = list.length > 0;
  $('#grid').innerHTML = list
    .map((tile) => {
      const truth = state.truth[tile.tile_id] ?? {};
      const info = CATEGORY_INFO[tile.category] ?? { label: tile.category, hint: '' };
      const match = tile.correct
        ? '<span class="match">✓ matches ground truth</span>'
        : `<span class="match" style="color:var(--yellow)">△ expected ${tile.expected_gate ?? '?'}</span>`;
      const flaws =
        Array.isArray(truth.flaws) && truth.flaws.length
          ? `<details><summary>introduced flaws</summary>${truth.flaws.join(', ')}</details>`
          : '';
      const desc = truth.description ? `<div class="match">${truth.description}</div>` : '';
      const img = tileImageUrl(tile.tile_id)
        ? `<img src="${tileImageUrl(tile.tile_id)}" alt="${tile.tile_id}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=&quot;noimg&quot;>image unavailable<br>in snapshot mode</span>'">`
        : '<span class="noimg">image unavailable<br>in snapshot mode</span>';
      return `<div class="card"><figure>${img}</figure><div class="body">
        <div class="top"><span class="score ${tile.gate}">${tile.score}</span><span class="tag" title="${info.hint}">${info.label}</span></div>
        <span class="name">${tile.tile_id.split('/').pop()}</span>${match}${desc}${flaws}
      </div></div>`;
    })
    .join('');
}

async function main() {
  const { results, truth } = await loadData();
  state.results = results;
  state.truth = truth;
  renderBadge();
  renderSummary();
  renderControls();
  renderGrid();
}

main().catch((error) => {
  $('#source-badge').textContent = `failed to load data: ${error.message}`;
  $('#grid').innerHTML = '';
});
