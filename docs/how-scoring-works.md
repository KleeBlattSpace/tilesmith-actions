# How TileSmith scoring works

A transparent, plain-language explanation of what the TileSmith QC score means — and what deliberately stays on our servers.

**Contents:** [The idea](#the-idea) · [What we check](#what-we-check) · [Scores and gates](#scores-and-gates) · [Size classes](#size-classes) · [What happens to your images](#what-happens-to-your-images) · [What's in this repo vs. what isn't](#whats-in-this-repo-vs-what-isnt) · [Limitations](#limitations)

---

## The idea

A game tile has one job: **repeat without being noticed.** When a tileable texture is laid out in a grid, even small flaws become glaring — a seam that doesn't line up, a dark border framing every repetition, a compression artifact that tiles into a visible grid pattern. TileSmith QC looks at your tiles the way a picky player's eye will: tiled, repeated, and unforgiving.

## What we check

Every tile is analyzed in three dimensions:

### 1. Seams — do the edges line up?

When a tile repeats, its left edge meets its right edge (and top meets bottom). If the pixels on opposite edges don't continue each other naturally, you get visible seams — hard lines cutting through your floor, grass, or brickwork. We assess how well opposite edges of the tile flow into each other.

### 2. Borders — is the edge region clean?

Some tiles carry an unintended dark or colored rim from sloppy export, cropping, or filtering. Repeated across a map, that rim becomes a grid of frames around every tile. We check the edge region of the tile for artifacts like these.

### 3. Visual artifacts — is the interior sound?

Inside the tile we look for the usual suspects that survive into production far too often: banding, blocky compression artifacts, stray pixels, noise from upscaling, and unexpected transparency.

Each dimension feeds the **overall score**; the overlay images in your report show exactly which tile got which verdict.

## Scores and gates

- The overall score is a number from **0 to 100** — higher is better.
- Every tile also gets one of three gates:

| Gate            | Meaning                       | Suggested action                                         |
| --------------- | ----------------------------- | -------------------------------------------------------- |
| 🟢 `Production` | No meaningful issues found    | Ship it                                                  |
| 🟡 `Review`     | Minor issues — often cosmetic | Skim the overlay; usually fine, occasionally worth a fix |
| 🔴 `Reject`     | Clear problems detected       | Open the overlay; fix before merge                       |

Which gate a score maps to is decided by the API (see [below](#whats-in-this-repo-vs-what-isnt)) — the action's `fail-on` input then turns gates into CI behavior: `Reject` (default) fails only on rejected tiles, `Review` also fails on review tiles, `never` is informational only.

> 💡 Treat the score as a **ranking and triage tool**, not a grade of your art: comparing tiles against each other and catching regressions in pull requests is where it shines.

## Size classes

Results include a size class (e.g. `16x16`, `64x64`). Tiles are grouped by their native resolution, because what counts as a "minor" seam on a busy 64×64 texture can be very visible on a flat 16×16 one. The size class tells you at which scale a tile was assessed.

## What happens to your images

1. The action reads the tile **in workflow memory**, sends it over TLS to the TileSmith scoring API.
2. The image is scored in memory and **discarded** — images are never stored, by us or in your artifacts.
3. What remains: the scores and metadata you see in the report (file path, score, gate, size class), plus — unless you set `upload-report: false` — an anonymous aggregate summary (repo, ref, commit, action version, gate counts, average score; see [Privacy](../README.md#privacy)).

## What's in this repo vs. what isn't

This repository is the **client**. It is fully open (MIT) and you can read every line of it:

| In this repository (open source)                                         | On the TileSmith servers (not open source)             |
| ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Finding tiles by glob patterns                                           | The analysis models behind seams / borders / artifacts |
| Calling the scoring API with retries, timeouts, rate-limit handling      | Score computation, weighting, and gate thresholds      |
| Drawing the overlay PNGs (colored frame + score label — purely cosmetic) | The scoring pipeline and model updates                 |
| PR comment, step summary, `report.json`, outputs                         | Anonymous aggregate statistics                         |

So the honest deal is: **you can verify exactly what data leaves your repo and how it's reported, while the evaluation itself remains our core IP.** If you want to know more about the scoring methodology itself, ask in [Discussions](https://github.com/KleeBlattSpace/tilesmith-actions/discussions) — we're happy to talk about it.

## Limitations

Being upfront about them:

- A score describes **technical tileability**, not artistic quality. A boring-but-perfect tile scores high; a gorgeous but seamy one scores low.
- Scores are heuristics. False positives happen — that's exactly why `Review` exists and why every result ships with a visual overlay for your own judgment.
- The action scores individual tiles. Full tilemap-level checks (transitions, autotiling rules) are on the [roadmap](../ROADMAP.md), not in this release.

---

← Back to the [README](../README.md) · Step-by-step setup: [Usage guide](usage-guide.md)
