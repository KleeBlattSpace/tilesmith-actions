# TileSmith QC

[![Self-test](https://github.com/KleeBlattSpace/tilesmith-actions/actions/workflows/selftest.yml/badge.svg)](https://github.com/KleeBlattSpace/tilesmith-actions/actions/workflows/selftest.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A free, zero-friction GitHub Action from [TileSmith Studio](https://app.kleeblatt.space) that scores your game tiles for seams, borders, and visual artifacts — and reports the results right in your pull requests.

## What it does

- Finds PNG, JPEG, and WebP tiles below the paths you configure.
- Scores each tile through the TileSmith API — images are kept in memory only and never stored.
- Writes per-tile overlay images, a JSON report, a step summary, and an upserted PR comment (one comment, updated in place).

## Quickstart

1. Get a free API key at the [TileSmith dashboard](https://app.kleeblatt.space) and add it as the `TILESMITH_API_KEY` secret in your repo (**Settings → Secrets and variables → Actions**).
2. Add this workflow as `.github/workflows/tilesmith.yml`:

```yaml
name: TileSmith QC
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  qc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: KleeBlattSpace/tilesmith-actions@v1
        with:
          api-key: ${{ secrets.TILESMITH_API_KEY }}
          paths: 'assets/**'
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: tilesmith-report
          path: tilesmith-report/
```

The artifact contains `report.json` plus one overlay PNG per tile (border color = gate: green Production, yellow Review, red Reject).

No API key? The action prints a notice and exits successfully — fork PRs without secrets never break your workflows.

## Inputs

| Input           |     Default | Description                                                                                                          |
| --------------- | ----------: | -------------------------------------------------------------------------------------------------------------------- |
| `api-key`       |   _(empty)_ | TileSmith API key (`ts_…`). Optional: empty key ⇒ skip with notice instead of failing.                               |
| `paths`         | `assets/**` | Comma-separated glob patterns. `**` crosses directories, `*`/`?` stay in one segment; a bare dir acts like `dir/**`. |
| `fail-on`       |    `Reject` | `Reject`, `Review`, or `never`.                                                                                      |
| `max-files`     |       `100` | Maximum 1–500 tiles per run (a notice is emitted when the limit is hit).                                             |
| `upload-report` |      `true` | Upload the aggregate report (see [Privacy](#privacy)). Set to `false` to score fully offline from our side.          |

## Outputs

| Output                             | Description                                          |
| ---------------------------------- | ---------------------------------------------------- |
| `production` / `review` / `reject` | Number of tiles in each gate.                        |
| `skipped`                          | Tiles that could not be scored (network/API errors). |
| `avg`                              | Average score.                                       |
| `report`                           | Path to `tilesmith-report/report.json`.              |

## Example PR comment

```markdown
## TileSmith QC

**6** tiles scored · Average **91.4**

| File             | Score | Gate       | Size class |
| ---------------- | ----: | ---------- | ---------- |
| assets/brick.png |    95 | Production | 64x64      |
| assets/grass.png |    88 | Review     | 64x64      |
| assets/dirt.png  |    61 | Reject     | 64x64      |
| …                |       |            |            |

🍀 This service is free. To keep it free, we collect anonymous scoring logs (scores, gate,
size class, timestamp). Images and personal data are never stored.

Get your free API key · Review or Reject results may require an upgrade.
```

## Privacy

> 🍀 This service is free. To keep it free, we collect anonymous scoring logs (scores, gate, size class, timestamp). Images and personal data are never stored.

- Image bytes stay in workflow memory; only scores and metadata are processed. No custom telemetry is emitted by this action.
- With `upload-report: true` (default), an **aggregate** summary is sent to the TileSmith API after each run: repo, ref, commit, action version, gate counts, average score, and per-tile `file` name, score, gate, and size class. Set `upload-report: false` if you do not want that.

## Pricing

The free tier covers hobby and small studio use. When you hit the quota, the action exits with an actionable message and a dashboard link — it never fails silently.

## FAQ and troubleshooting

- **Fork PRs / missing API key** — the action emits a notice and exits `0`; OSS workflows keep working.
- **Authentication (401/403) or quota (402) errors** — exit code `2` with an actionable message (check key / dashboard link).
- **Exit codes** — `0` = OK, `1` = quality gate tripped (`fail-on`), `2` = configuration/auth/quota error.
- **Network and server failures** — retried with exponential backoff; rate limits respect `Retry-After`. Tiles that still fail are counted in the `skipped` output and never break the run.
- **`paths` matches nothing** — check the patterns; a `::warning` is emitted when no tiles are found.
- **Informational only?** — set `fail-on: never`.

## Development

```bash
npm ci
npm test          # unit + API-contract tests
node test/smoke.mjs  # end-to-end run of dist/ against a local mock API
npm run build     # rebuild dist/index.mjs (kept committed; CI auto-syncs it)
npm run lint
npm run format:check
```

The committed `dist/index.mjs` is the runtime artifact, so consuming workflows never install dependencies. See [ROADMAP.md](ROADMAP.md) for current status and planned work.

## Versioning

Use the moving major tag `@v1` for compatible releases, or pin an exact version such as `@v1.1.0` for reproducibility. Releases are signed with GitHub build-provenance attestations — verify with `gh attestation verify`.

## License

MIT. See [LICENSE](LICENSE). Test fixtures are CC0 from [Kenney](https://kenney.nl) (see `tests/fixtures/`).
