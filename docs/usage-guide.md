# TileSmith QC — Usage Guide

Everything you need to go from zero to automated tile quality checks on every pull request.

**Contents:** [Requirements](#requirements) · [Setup](#setup) · [Choosing `paths`](#choosing-paths) · [Workflow recipes](#workflow-recipes) · [Reading the results](#reading-the-results) · [`report.json` reference](#reportjson-reference) · [Controlling cost & quota](#controlling-cost--quota) · [Troubleshooting](#troubleshooting) · [FAQ](#faq)

---

## Requirements

- A GitHub repository containing game tiles as PNG, JPEG, or WebP files.
- A free TileSmith API key from the [dashboard](https://tilesmith.kleeblatt.space).
- Nothing else — no dependencies, no build step, works on `ubuntu-latest`, `windows-latest`, and `macos-latest`.

## Setup

### 1. Get your API key

Create a free key at [app.kleeblatt.space](https://tilesmith.kleeblatt.space). Keys look like `ts_…`.

### 2. Add the key as a repository secret

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

- Name: `TILESMITH_API_KEY`
- Value: your key

Secrets are never exposed to fork pull requests — the action handles that gracefully (see [FAQ](#faq)).

### 3. Add the workflow

Create `.github/workflows/tilesmith.yml`:

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

Open a pull request that changes a tile — within a minute you'll get the PR comment, overlays, and the report artifact.

### 4. (Recommended) Make it a required check

In **Settings → Branches → Branch protection**, add `qc` as a required status check so a PR with rejected tiles cannot merge silently.

## Choosing `paths`

`paths` is a comma-separated list of glob patterns. Semantics:

| Pattern          | Matches                                               | Does not match        |
| ---------------- | ----------------------------------------------------- | --------------------- |
| `assets/**`      | everything below `assets/`, any depth                 | `ui/assets/x.png`     |
| `assets/*`       | direct children of `assets/` only                     | `assets/nested/x.png` |
| `assets/*.png`   | PNGs directly in `assets/`                            | `assets/nested/x.png` |
| `**/tiles/*.png` | `tiles/` folders at any depth, incl. top level        | `tiles/sub/x.png`     |
| `tiles/?.png`    | single-character names like `tiles/a.png`             | `tiles/ab.png`        |
| `art`            | everything below `art/` (bare dirs act like `art/**`) | `article/x.png`       |

Examples:

```yaml
paths: 'assets/**' # one tree
paths: 'assets/tiles/**, art/tileset/**' # several roots
paths: '**/tiles/*.png' # tiles folders anywhere
```

If nothing matches, the run emits a `::warning` — check your patterns before assuming the action is broken.

## Workflow recipes

### Informational only (never fails the build)

```yaml
- uses: KleeBlattSpace/tilesmith-actions@v1
  with:
    api-key: ${{ secrets.TILESMITH_API_KEY }}
    fail-on: never
```

### Strict: fail when tiles need review

```yaml
- uses: KleeBlattSpace/tilesmith-actions@v1
  with:
    api-key: ${{ secrets.TILESMITH_API_KEY }}
    fail-on: Review
```

### Using the outputs in later steps

```yaml
- uses: KleeBlattSpace/tilesmith-actions@v1
  id: qc
  with:
    api-key: ${{ secrets.TILESMITH_API_KEY }}

- name: Summarize
  run: |
    echo "Production: ${{ steps.qc.outputs.production }}"
    echo "Review:     ${{ steps.qc.outputs.review }}"
    echo "Reject:     ${{ steps.qc.outputs.reject }}"
    echo "Skipped:    ${{ steps.qc.outputs.skipped }}"
    echo "Average:    ${{ steps.qc.outputs.avg }}"
```

### Keeping runs lean on big asset repos

```yaml
- uses: KleeBlattSpace/tilesmith-actions@v1
  with:
    api-key: ${{ secrets.TILESMITH_API_KEY }}
    paths: 'assets/tiles/**'
    max-files: '50'
```

## Reading the results

- **PR comment** — gate counts at a glance, a link to [TileSmith settings](https://tilesmith.kleeblatt.space), then a collapsible per-tile table. One comment per PR, updated in place; lists longer than 30 tiles point at the artifact.
- **Overlay PNGs** (in the `tilesmith-report` artifact) — your tile with a colored frame and score label:
  - 🟢 green `Production` — ready to ship
  - 🟡 yellow `Review` — take a look, usually minor seam/border issues
  - 🔴 red `Reject` — clear problems detected
- **Step summary** — the same overview on the workflow run page (Job summary), plus a folded `TileSmith QC overview` group in the log with the dashboard URL.
- **`report.json`** — machine-readable results, see [below](#reportjson-reference).

Exit codes, in case you script around the action: `0` OK · `1` quality gate tripped (`fail-on`) · `2` configuration/auth/quota error.

## `report.json` reference

```json
{
  "repo": "you/your-game",
  "ref": "refs/pull/42/merge",
  "commit": "…40-char SHA…",
  "action_version": "1.1.0",
  "stats": { "total": 6, "production": 3, "review": 2, "reject": 1, "avg": 87.3 },
  "tiles": [{ "file": "assets/tiles/brick.png", "overall": 95, "gate": "Production", "size_class": "64x64" }]
}
```

No image data, no hashes — just paths, scores, and metadata.

## Controlling cost & quota

- **Free tier** — covers hobby and small studio use; see the [dashboard](https://tilesmith.kleeblatt.space) for your plan's limits.
- **`max-files`** caps tiles per run (1–500, default 100). Use narrower `paths` to spend quota on the tiles that matter.
- When the quota is exhausted, the action exits `2` with a dashboard link — it never fails silently, and it never marks good tiles as bad.

## Troubleshooting

| Symptom                            | Likely cause → fix                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `No image tiles found for paths …` | Pattern doesn't match — see [Choosing `paths`](#choosing-paths).                                                                      |
| No PR comment, but run is green    | Missing `permissions: pull-requests: write`, or the run isn't a pull_request event. The step summary and artifact are still produced. |
| `No API key – skipping QC` notice  | Secret missing/empty (normal on fork PRs) — see [FAQ](#faq).                                                                          |
| Exit `2`, authentication message   | Key wrong/revoked — re-copy it from the [dashboard](https://tilesmith.kleeblatt.space).                                               |
| Exit `2`, quota message            | Plan limit reached — the message contains the upgrade link.                                                                           |
| Exit `1`                           | Working as intended: tiles below your `fail-on` gate were found. Check the overlays.                                                  |
| Empty artifact                     | No tiles matched `paths`, or the upload step lacks `if: always()`.                                                                    |

## FAQ

**Does it work on fork pull requests?**
Yes. Forks don't get your secrets, so the action skips scoring with a notice and exits `0` — your (and contributors') workflows never break. Scoring resumes on PRs from your own repo.

**Does it modify my files?**
Never. It only reads your tiles and writes to `tilesmith-report/` (overlays + `report.json`), which you upload as an artifact.

**Private repos?**
Yes, the action runs anywhere GitHub Actions run. Nothing about your repo is required to be public.

**Which file formats?**
PNG, JPEG, WebP.

**Where do I ask questions?**
[GitHub Discussions](https://github.com/KleeBlattSpace/tilesmith-actions/discussions) — for key/quota/billing see [SUPPORT.md](../SUPPORT.md).

---

← Back to the [README](../README.md) · How the scoring works: [How scoring works](how-scoring-works.md)
