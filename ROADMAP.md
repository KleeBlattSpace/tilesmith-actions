# Roadmap & Status

Where this action stands and what is left before/after announcing it publicly.
Last updated: 2026-09-07 (v1.1.0).

## ✅ Done — working today

- **Core scoring pipeline**: glob discovery (PNG/JPEG/WebP), bounded concurrency (4), 30 s per-tile timeout, retries with exponential backoff, `Retry-After` handling, 401/403/402 hard errors with actionable messages (exit 2).
- **Zero-friction adoption**: missing/empty `api-key` ⇒ notice + exit 0 (fork PRs never break); `api-key` no longer `required: true`.
- **Outputs**: overlays (one PNG per tile, gate-colored border + score label), `report.json`, step summary, upserted PR comment (paginated lookup — no duplicate comments), action outputs `production/review/reject/skipped/avg/report`.
- **Quality gates**: `fail-on: Reject|Review|never` with exit codes 0/1/2.
- **Tests**: 13 unit/contract tests (`npm test`) + end-to-end smoke test of the committed bundle against a mock API (`node test/smoke.mjs`) covering keyless, keyed, glob scoping, overlay-collision handling, outputs, and fail-on.
- **CI**: `selftest.yml` (test/build/lint/format + dogfooding the action on CC0 fixtures, keyless or keyed via `TILESMITH_STAGING_KEY`), `dist.yml` (auto-rebuild + push of committed `dist/`, fork-safe), `release.yml` (tag `v*` ⇒ sync check ⇒ attestation ⇒ GitHub release ⇒ move major tag).
- **Docs**: README (quickstart incl. artifact upload, inputs/outputs, example PR comment, honest privacy section, FAQ), SECURITY.md, CHANGELOG, MIT license, CC0 fixture provenance.

## 🔜 Before announcing (blocking)

1. **Merge to `main`** and let CI run green end-to-end (Self-test badge).
2. **Tag `v1.1.0`** — `release.yml` then creates the release, signs the attestation, and moves `v1`. Until then README's `@v1` reference does not resolve.
3. **Configure repo secrets** `TILESMITH_STAGING_KEY` (+ optional `TILESMITH_STAGING_URL`) so the keyed dogfood assertions (base-01 → 97/Production, brick → 95/64x64, ±1) actually run in CI.
4. **Verify the API contract live**: `POST /v1/score` and `POST /v1/reports` (the reports endpoint feeds the planned badge; upload failures must stay warning-only).
5. **Dogfood externally**: run the action in the `gc-pipeline-benchmark` repo; capture a real PR-comment screenshot for the README.
6. **GitHub Marketplace**: add topic `github-actions` so the action is listed/discoverable.

## 💡 Later (phase 2 ideas)

- **Score cache** (`.tilesmith-cache.json` + `actions/cache`) — unchanged tiles cost no quota.
- **Badge for your README** — needs the API badge endpoint (`/badge/{user}/{repo}.json`).
- **Contact sheet** — montage of all overlays as one image.
- **SARIF output** — results in the GitHub Security tab.
- **Single source of truth for the version** — inject `package.json` version at build time instead of the `ACTION_VERSION` constant.
- **Keyless local lint** — a small always-free local seam/border check to make the action valuable even without any API key.
- Deprecation policy: old majors get a 6-month `::warning` before archival.
