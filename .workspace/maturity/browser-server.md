# §1d Browser/Server

Reference: `lib/env` provides `env` proxy and `runtime.isBrowser`/`runtime.isNode`.

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Only works in one environment (uses `node:fs`, `node:path`) | scan-js, test-analysis |
| 1 | Works in both but uses `process.env` directly | sort, timeline |
| 2 | Works in both, uses `lib/env` for environment reads | expect |
| 3 | Tested in both, graceful degradation when features unavailable | — |
| 4 | Optimized per-environment with browser/node paths in package.json exports | expect (has index.browser.js) |

## Observations

- sort and timeline use `process.env.VERBLETS_DEBUG` directly — isomorphic gap.
- test-analysis subsystem is Node-only by design (acceptable for Development tier).
