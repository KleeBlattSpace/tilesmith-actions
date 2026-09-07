# Contributing to TileSmith QC

Thanks for your interest in improving TileSmith QC! 🍀

## Getting started

1. Fork the repo and create a branch from `main`.
2. Install and verify the toolchain (Node.js ≥ 20, npm):

   ```bash
   npm ci
   npm test             # unit + contract tests
   node test/smoke.mjs  # end-to-end run against a local mock API
   npm run lint
   npm run format:check
   ```

3. Make your change. Keep user-facing strings (README, PR comments, errors) in **English**.

## Project layout

| Path                       | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `src/main.mjs`             | Entrypoint: input validation, tile discovery, scoring, outputs       |
| `src/overlay.mjs`          | Overlay PNG rendering (gate-colored frame + score label)             |
| `src/report.mjs`           | Aggregation, markdown report, step summary, PR comment upsert        |
| `dist/index.mjs`           | Committed bundle consumed by user workflows — **never edit by hand** |
| `test/`, `tests/fixtures/` | Tests and CC0 fixture tiles (Kenney)                                 |

## Important: `dist/` is generated

`dist/index.mjs` is built from `src/` with `npm run build` and committed so consumers need no install step.

- CI (`dist.yml`) auto-rebuilds and pushes `dist/` for same-repo branches when `src/` changes.
- If you develop locally, run `npm run build` and commit the updated `dist/` together with your `src/` change, or let CI do it after you push.

## Pull requests

- Keep PRs small and focused; one concern per PR.
- Add or update tests for any behavior change.
- Update `README.md` and `CHANGELOG.md` when user-facing behavior changes.
- Follow the PR template checklist.
- CI must be green (`Self-test` + `dist`) before merge.

## Commit style

Conventional-ish prefixes keep the history readable: `fix:`, `feat:`, `docs:`, `ci:`, `test:`, `build:`.

## Reporting bugs & security

See [SUPPORT.md](SUPPORT.md). Security reports must follow [SECURITY.md](SECURITY.md).
