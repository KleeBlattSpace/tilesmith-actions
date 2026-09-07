# TileSmith score API — fair use

The GitHub Action talks to the TileSmith score API (`api.kleeblatt.space`). There is **no published monthly call limit** on the Free plan right now. That is not a promise of unlimited capacity forever.

Live usage, key rotation, and billing: [Account & API Keys](https://tilesmith.kleeblatt.space) (sign in).

## Intended use

Fair use is scoring **your own game tiles** in **your own CI** (pull requests, a few workflows, hobby and small-studio volume).

A **billable unit** is one **successful** score request. Failed auth, 4xx/5xx, and rate-limited calls show up in the dashboard but are not billed.

Typical fair volume looks like: default `max-files` (100) on pull requests, not on every push to a busy branch, not a public scoring proxy.

## Not fair use

- Reselling, wrapping, or exposing the score API as your own product
- Sharing or committing API keys (`tsmith_live_…`)
- High-volume farms, scraping, load tests, or scoring tiles you do not own
- Circumventing rate limits or spinning extra accounts to multiply free capacity
- Using the API as a general image-analysis service (it is for **game tiles**)

## What we may do

- Rate-limit (HTTP 429); the action skips those tiles and keeps going
- Return HTTP 402 when an account is over quota or credits
- Revoke keys or pause an account that is abusing the service
- Introduce a **published monthly allowance** later; the dashboard is always the source of truth

Hobby projects and game jams are welcome. If you need sustained production volume, use **Billing & purchases** on the same Account page (Stripe).

Questions: [admin@kleeblatt.space](mailto:admin@kleeblatt.space)
