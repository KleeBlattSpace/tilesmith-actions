# Changelog

All notable changes to this project are documented here.

## [1.1.0] - 2026-09-07

### Highlights

- CI is green again: replaced the broken `verify-dist.yml` (invalid YAML) and the racing/overlapping dist workflows with a single fork-safe `dist.yml`.
- `selftest.yml` now dogfoods the action itself on the CC0 fixtures (keyless graceful path always; keyed assertions when `TILESMITH_STAGING_KEY` is set) and uploads the report artifact.
- New `release.yml`: tagging `v*` verifies dist sync, signs build provenance, creates the GitHub release, and moves the major tag.

### Breaking

- None.

### Fixes

- Overlay files were written as `foo.png.png`; sanitized names could silently collide (`a/b.png` vs `a_b.png`) — now suffixed deterministically.
- `paths` glob semantics: `*` no longer crosses `/` (use `**`); `?` and bare-directory patterns supported; empty patterns ignored.
- PR comment upsert now paginates (up to 1000 comments) instead of posting duplicates on busy PRs.
- `.gitignore` no longer ignores `dist/` (it is a committed runtime artifact) and no longer hides CC0 fixture provenance docs.
- README/SECURITY/LICENSE referenced the wrong org casing (`Kleeblatt-space` → `KleeBlattSpace`).

### Added

- `api-key` is now optional (`required: false`) so workflows without any key still run (notice + exit 0).
- New `skipped` output (tiles that could not be scored); `::warning` when `paths` matches nothing; `::notice` when `max-files` truncates the run.
- PR comment / step summary collapse long tile lists after 30 rows.
- End-to-end smoke test for the committed bundle (`test/smoke.mjs`) and glob/pagination unit tests.
- `ROADMAP.md` tracking status and remaining work.
- Docs: full [usage guide](docs/usage-guide.md) and a conceptual [how-scoring-works](docs/how-scoring-works.md) explainer — the evaluation models/thresholds remain server-side and are not part of this repository.

[Unreleased]: https://github.com/KleeBlattSpace/tilesmith-actions/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/KleeBlattSpace/tilesmith-actions/releases/tag/v1.1.0
[1.0.0]: https://github.com/KleeBlattSpace/tilesmith-actions/releases/tag/v1.0.0

## [1.0.0] - 2026-09-02

### Highlights

- Initial TileSmith QC GitHub Action implementation.
- Local overlays, PR comment upsert, step summary, JSON artifact, and aggregate report upload.
- Secure input validation, bounded concurrency, retries, and graceful fork-PR behavior.
