# Developing Verblets

This is the guide for working on the verblets codebase. For design patterns and implementation details, see the DESIGN.md files in [chains](./src/chains/DESIGN.md) and [verblets](./src/verblets/DESIGN.md).

## Architecture

The project has three tiers of modules, each with clear responsibilities:

**Verblets** (`src/verblets/`) are single-purpose AI functions. Each makes at most one LLM call, has no retry logic, and returns a constrained output. Think of them as intelligent primitives — `classify`, `bool`, `sentiment`, `number`.

**Chains** (`src/chains/`) orchestrate multiple operations into workflows. They handle batching, retries, progress tracking, and multi-step reasoning. Chains can use verblets, other chains, and library utilities. Examples: `filter`, `map`, `score`, `document-shrink`, `SocraticMethod`.

**Library utilities** (`src/lib/`) provide infrastructure with no direct LLM usage. The `llm` module is the exception — it's the LLM wrapper itself. Everything else is pure functions, data structures, and helpers: `retry`, `parallel-batch`, `ring-buffer`, `progress-callback`.

Dependency rules: verblets cannot import chains. Chains can import anything. Library utilities should minimize dependencies.

## Module Structure

Every module follows the same layout:

```
module-name/
├── index.js          # Implementation (default export)
├── index.spec.js     # Deterministic tests with mocked LLM
├── index.examples.js # Integration tests with real LLM calls
└── README.md         # Documentation
```

See [guidelines/DOCUMENTATION.md](./guidelines/DOCUMENTATION.md) for README standards.

## Isomorphic Design

All modules are designed to work in both Node.js and the browser. The package has two entry points — `src/index.js` for Node and `src/index.browser.js` for the browser bundle — both re-exporting `src/shared.js`. The bundler's `browser` field in `package.json` selects the right one automatically.

Modules that need platform-specific behavior use runtime detection (`src/lib/env/`) to adapt. For example, `src/lib/crypto/` uses `node:crypto` in Node and the Web Crypto API in browsers, behind a single `createHash` interface.

### Dynamic Import Policy

The project avoids dynamic `import()` in production code. Static imports keep bundles predictable and make dependency graphs visible at a glance. Two modules are the exceptions:

- **`src/lib/transcribe/index.js`** — dynamically imports `whisper-node` and `node-record-lpcm16`, which are Node-only native dependencies that would break browser bundles.
- **`src/lib/crypto/index.js`** — dynamically imports `node:crypto`, falling back to Web Crypto on browsers.

Spec files also use dynamic imports for vitest module mocking, which is expected and fine — the restriction applies to production code.

## Testing

The project uses two kinds of tests, run by separate vitest configurations.

**Spec tests** (`*.spec.js`) mock LLM calls for fast, deterministic results. They use table-driven `examples` arrays and run in CI. No API keys needed. Config: `.vitest.config.js`.

**Example tests** (`*.examples.js`) make real LLM calls to validate behavior against actual models. They use `aiExpect` for semantic assertions and require API keys in `.env`. Config: `.vitest.config.examples.js`, which loads dotenv so tests can read `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`. Each example test sets a two-minute timeout (`longTestTimeout` from `src/constants/common.js`) since real LLM round-trips are slow.

### Commands

```bash
npm test                # Spec tests (mocked, fast)
npm run examples        # Example tests (real LLM, slow)
npm run lint            # Check code style
npm run lint:fix        # Auto-fix lint issues
npm run build           # Build for distribution
```

### Test Budget Tiers

Example tests are grouped by cost. The `VERBLETS_EXAMPLE_BUDGET` env var controls which tiers run:

```bash
npm run examples                              # 'low' (default) — single-call examples only
VERBLETS_EXAMPLE_BUDGET=medium npm run examples  # adds multi-call chains (up to ~6 LLM calls per test)
VERBLETS_EXAMPLE_BUDGET=high npm run examples    # all examples including 10+ call chains
```

Tests gate themselves with `describe.skipIf(!isMediumBudget)` and `describe.skipIf(!isHighBudget)`, both exported from `src/constants/common.js`. The nightly CI workflow runs all three tiers in a matrix.

### Environment Variables

| Variable | Effect |
|---|---|
| `VERBLETS_EXAMPLE_BUDGET` | Test cost tier: `low` (default), `medium`, `high` |
| `VERBLETS_DISABLE_CACHE=true` | Skip Redis/memory cache, force fresh LLM calls |
| `VERBLETS_CACHE_TTL` | Cache expiry in milliseconds (default: 365 days) |
| `VERBLETS_ARCH_LOG=debug` | Verbose output from architecture test runs |

### Caching

Example tests cache LLM responses in Redis to reduce API costs and speed up repeat runs. When Redis is unavailable, tests fall back to in-memory caching. Set `VERBLETS_DISABLE_CACHE=true` to bypass caching entirely when you need fresh responses.

### Architecture Tests

A third vitest configuration (`.vitest.config.arch.js`) runs architecture tests that use AI analysis to validate code quality against guidelines:

```bash
VERBLETS_ARCH_LOG=debug npm run arch:once
```

## Adding a Module

1. Create the module directory under the appropriate tier (`chains/`, `verblets/`, or `lib/`)
2. Implement `index.js` with a default export
3. Add `index.spec.js` with mocked LLM and table-driven examples
4. Add `index.examples.js` with real LLM assertions
5. Add `README.md` following [documentation guidelines](./guidelines/DOCUMENTATION.md)
6. Export from `src/shared.js` (this feeds both Node and browser builds)
7. Add to the appropriate section in the root `README.md`

## Exports

Internally, the project maintains clear tiers (chains, verblets, lib). Externally, everything exports flat from `@far-world-labs/verblets` — consumers don't need to know which tier a function lives in.

All public exports are defined in `src/shared.js`, which is re-exported by both `src/index.js` (Node) and `src/index.browser.js` (browser bundle).

## Config System

All chains and verblets accept a `config` object as their last argument. Consumers set options by name on that object — model selection, dial options, batch/retry tuning — and the chain resolves everything internally:

```javascript
import { truncate } from '@far-world-labs/verblets';

await truncate(longText, 'keep the technical details', {
  strictness: 'high',   // dial option — resolved by the chain's mapper
  chunkSize: 2000,      // plain option — used directly
  llm: 'fastGood',      // model selection — resolved by callLlm
});
```

Config flows through without extraction — pass `config` directly to `callLlm`, `retry`, and sub-chains. Each subsystem resolves what it needs from the same object.

Detailed documentation by audience:

- [Configuration](./docs/configuration.md) — consumer-facing: model selection, capabilities, parameters, policy
- [Option Resolution](./docs/option-resolution.md) — chain author internals: `initChain`, `getOption`, `withPolicy`, mappers
- [Batching](./docs/batching.md) — auto-sizing, `parallelBatch`, `prepareBatches`
- [Progress Tracking](./docs/progress-tracking.md) — `onProgress`, `scopeProgress`, event lifecycle
- [Retry](./docs/retry.md) — config-aware retries, retryable errors, abort signal
- [JSON Schemas](./guidelines/JSON_SCHEMAS.md) — `response_format`, schema design, auto-unwrapping
