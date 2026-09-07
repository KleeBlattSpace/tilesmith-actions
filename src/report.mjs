const MARKER = '<!-- tilesmith-qc -->';
const DASHBOARD_URL = 'https://tilesmith.kleeblatt.space';
const DISCLAIMER =
  '🍀 This service is free. To keep it free, we collect anonymous scoring logs (scores, gate, size class, timestamp). Images and personal data are never stored.';

export function aggregate(tiles) {
  const stats = { total: tiles.length, production: 0, review: 0, reject: 0, avg: 0 };
  for (const tile of tiles) {
    const gate = String(tile.gate ?? '').toLowerCase();
    if (gate === 'production') stats.production += 1;
    else if (gate === 'reject') stats.reject += 1;
    else stats.review += 1;
  }
  const scores = tiles.map((t) => Number(t.overall)).filter(Number.isFinite);
  stats.avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  return stats;
}

/** Maximum table rows rendered in a PR comment / step summary before collapsing. */
const MAX_ROWS = 30;

/**
 * Job-summary / PR-comment body shown in *other people's* workflows.
 * Lead with a one-glance gate board + a dashboard link; table is secondary.
 */
export function markdownReport(stats, tiles, { skipped = 0 } = {}) {
  const shown = tiles.slice(0, MAX_ROWS);
  const rows = shown
    .map((t) => `| ${t.file} | ${t.overall ?? '—'} | ${t.gate ?? 'Review'} | ${t.size_class ?? '—'} |`)
    .join('\n');
  const more =
    tiles.length > MAX_ROWS
      ? `\n\n…and ${tiles.length - MAX_ROWS} more — see the \`tilesmith-report\` artifact for the full list.\n`
      : '';
  const skippedLine =
    skipped > 0 ? `\n_${skipped} tile${skipped === 1 ? '' : 's'} could not be scored (network/API)._\n` : '';
  const upgrade = stats.review + stats.reject > 0 ? ' · Review or Reject results may require an upgrade.' : '';
  return `${MARKER}
## TileSmith QC

| ✅ Production | ⚠️ Review | ❌ Reject | Average |
| :---: | :---: | :---: | :---: |
| **${stats.production}** | **${stats.review}** | **${stats.reject}** | **${stats.avg}** |

**${stats.total}** tiles scored${skippedLine}

[Account & API Keys](${DASHBOARD_URL}) — create, rotate, revoke keys · usage stats · billing (sign in) · [Marketplace](https://github.com/marketplace/actions/tilesmith-qc)

<details>
<summary>Per-tile scores</summary>

| File | Score | Gate | Size class |
|---|---:|---|---|
${rows || '| No matching tiles | — | — | — |'}
${more}
</details>

${DISCLAIMER}

[Create or rotate an API key](${DASHBOARD_URL})${upgrade}`;
}

export async function writeSummary(summaryPath, stats, tiles, extras = {}) {
  if (!summaryPath) return;
  const { appendFile } = await import('node:fs/promises');
  await appendFile(summaryPath, `${markdownReport(stats, tiles, extras)}\n`);
}

/** Folded log group so the consumer workflow log has a scannable overview. */
export function logOverview(stats, { skipped = 0 } = {}) {
  console.log('::group::TileSmith QC overview');
  console.log(
    `Production ${stats.production} · Review ${stats.review} · Reject ${stats.reject} · skipped ${skipped} · avg ${stats.avg}`,
  );
  console.log(`Account & API Keys (sign in): ${DASHBOARD_URL}`);
  console.log('::endgroup::');
  console.log(`::notice::TileSmith QC — ${stats.total} tiles, avg ${stats.avg}. Keys/usage/billing: ${DASHBOARD_URL}`);
}

export async function upsertComment({ token, repo, issueNumber, body, fetchImpl = fetch }) {
  if (!token || !repo || !issueNumber) return false;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'content-type': 'application/json',
  };
  const base = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`;
  // Paginate through existing comments (100 per page, cap at 10 pages) so the
  // marker comment is found even on busy PRs instead of posting a duplicate.
  let existing;
  for (let page = 1; page <= 10 && !existing; page++) {
    const response = await fetchImpl(`${base}?page=${page}&per_page=100`, { headers });
    if (!response.ok) throw new Error(`GitHub comments lookup failed (${response.status})`);
    const comments = await response.json();
    if (!Array.isArray(comments) || comments.length === 0) break;
    existing = comments.find((comment) => String(comment.body ?? '').includes(MARKER));
  }
  const payload = JSON.stringify({ body });
  if (existing) {
    const update = await fetchImpl(`${base}/${existing.id}`, { method: 'PATCH', headers, body: payload });
    if (!update.ok) throw new Error(`GitHub comment update failed (${update.status})`);
  } else {
    const create = await fetchImpl(base, { method: 'POST', headers, body: payload });
    if (!create.ok) throw new Error(`GitHub comment creation failed (${create.status})`);
  }
  return true;
}

export { DISCLAIMER, MARKER, DASHBOARD_URL };
