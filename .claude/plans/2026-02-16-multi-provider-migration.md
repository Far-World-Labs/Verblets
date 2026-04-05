# Verblets Multi-Provider Architecture Migration Plan
**Date**: 2026-02-16
**Status**: Ready for execution
**Branch**: `fix/ai-test-hanging` (will create a new branch for this work)

---

## Instructions for New Claude Sessions

This plan is a complete specification for migrating verblets from OpenAI-only to a provider-agnostic multi-provider architecture. A new Claude session should:

1. Read this file first
2. Read `CLAUDE.md` for project rules and philosophy
3. Read `AGENTS.md` for architecture overview
4. Execute phases in order, running the verification gate after each phase
5. **Use subagents heavily** — launch Task agents for parallel work:
   - Phase 1 rename can use multiple agents: one for code files, one for docs, one for tests
   - Phase 2 model registry can use a Plan agent for design, then Explore agents to verify
   - Phase 3 adapters are independent — write all three in parallel
6. Never proceed to the next phase until the current gate passes

### Key Project Conventions
- ESM JavaScript (no TypeScript), `.js` files only
- Vitest for testing: `*.spec.js` (mocked), `*.examples.js` (live LLM)
- `npm run test` = spec tests, `npm run examples` = live tests, `npm run lint`, `npm run build`
- Every module: `index.js`, `index.spec.js`, `index.examples.js`, `README.md`
- No null (use undefined), no early returns, extract pure functions
- Verblets = single LLM call. Chains = orchestrators. Lib = no LLM.

### Critical Files to Read Before Starting
- `src/lib/chatgpt/index.js` — current LLM module (will become `src/lib/llm/index.js`)
- `src/constants/models.js` — current model definitions
- `src/services/llm-model/index.js` — model service (negotiation, config building)
- `src/services/llm-model/model.js` — token budgeting
- `src/lib/prompt-cache/index.js` — caching layer
- `src/shared.js` — public API exports
- `src/index.js` — entry point
- `src/constants/model-validation.js` + `model-definition-schema.json` — validation

### Environment
- `.env` has `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`
- Redis running via docker compose (`verblets-redis-1`)
- OpenWebUI running (`open-webui` container)
- Node.js ESM, Vite for build, Vitest for test

---

## Design Philosophy

The LLM layer is redesigned as provider-agnostic from the ground up. No OpenAI-specific naming remains. Both OpenAI and Anthropic are equal first-class providers, selected via model configuration. The core function is renamed from `chatGPT` → `llm`.

**Capability-based abstraction**: Names like `fastGood`, `cheap`, `reasoning` never reference a provider. They map to specific models via a configurable mapping that projects can override.

**Provider mixing**: Different calls within the same chain can use different providers. Each model in the catalog knows its own provider.

**Verification policy**: Every phase ends with `npm run test && npm run lint && npm run build`. If anything fails, fix before moving on. `npm run examples` runs after Phases 2 and 4.

---

## Phase 1: Rename `chatgpt` → `llm` (pure rename, no behavior change)

Goal: Eliminate all OpenAI-specific naming without changing any logic. After this phase, the codebase uses `llm` everywhere but still talks only to OpenAI via existing code paths.

### 1a. Move module directory
- `git mv src/lib/chatgpt/ src/lib/llm/`

### 1b. Rename all ~83 import sites
Every file that imports from `chatgpt/index.js` or calls `chatGPT()`:
- Update import paths: `chatgpt/index.js` → `llm/index.js`
- Update variable names: `chatGPT` → `llm`
- Update call sites: `chatGPT(prompt, ...)` → `llm(prompt, ...)`
- Update spec mocks: `vi.mock('...chatgpt/index.js')` → `vi.mock('...llm/index.js')`

### 1c. Update documentation (18 markdown files + cursor rules)
- `CLAUDE.md` — "chatGPT module" → "llm module", "chatGPT responses" → "LLM responses"
- `README.md` — all chatGPT/OpenAI-only references
- `AGENTS.md` — chatgpt wrapper reference
- `.cursorrules` / `.cursorrules-commands` — import paths, code examples
- `src/lib/llm/README.md` (moved + updated)
- `src/services/llm-model/README.md`, `src/verblets/DESIGN.md`
- `guidelines/*.md` (6 files), various chain/verblet READMEs

### 1d. Update public API exports
- `src/shared.js`: `export { default as llm }` from `./lib/llm/index.js`
- `src/index.js`: `export { llm as default }`

### 1e. Update build config
- `vite.config.js`: update any chatgpt references in aliases/externals (currently clean, but verify)

### ✓ Gate: `npm run test && npm run lint && npm run build`

---

## Phase 2: Model registry + capability mapping (behavior-preserving)

Goal: Separate "what models exist" (catalog) from "what model to use for each capability" (mapping). Capability names like `fastGood` are the public abstraction. Projects can override the mapping via `.verblets.json`.

### 2a. Model catalog (`src/constants/models.js` rewrite)

**1. Model catalog** — All available models across all providers, keyed by actual model name:
```js
const catalog = {
  'gpt-4o': {
    provider: 'openai',
    endpoint: 'v1/chat/completions',
    maxContextWindow: 128_000,
    maxOutputTokens: 16_384,
    requestTimeout: 20_000,
    get apiKey() { return env.OPENAI_API_KEY; },
    get apiUrl() { return env.OPENAI_PROXY_URL || 'https://api.openai.com/'; },
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    endpoint: 'v1/messages',
    maxContextWindow: 200_000,
    maxOutputTokens: 16_384,
    requestTimeout: 30_000,
    get apiKey() { return env.ANTHROPIC_API_KEY; },
    get apiUrl() { return 'https://api.anthropic.com/'; },
  },
  'claude-haiku-4-5': { provider: 'anthropic', ... },
  'claude-opus-4-5': { provider: 'anthropic', ... },
  'o4-mini-2025-04-16': { provider: 'openai', ... },
  'o3-2025-04-16': { provider: 'openai', ... },
  'gemma3:12b-it-qat': { provider: 'openwebui', ... },
};
```

**2. Default capability mapping** — Ships with verblets:
```js
const defaultMapping = {
  fastGood:    'gpt-4o',
  fastCheap:   'gpt-4o',
  reasoning:   'o4-mini-2025-04-16',
  privacy:     'gemma3:12b-it-qat',
};
```

**3. Per-project override** via `.verblets.json` at project root (gitignored):
```json
{
  "fastGood": "claude-sonnet-4-5",
  "fastCheap": "claude-haiku-4-5",
  "reasoning": "o3-2025-04-16"
}
```

**Resolution order**: project override → default mapping → direct catalog lookup.

- Remove `getOpenAIKey()` / `getOpenAIUrl()` helpers
- `validateEnvironment()`: require at least one API key for any provider in the active mapping
- Remove dead-code string constants and stale utility functions
- Keep the system prompt (shared across providers)

### 2b. Config loader (`src/lib/llm/config.js`, ~30 lines)
- Load `.verblets.json` from project root (if exists)
- Merge with default mapping
- Export `resolveModel(name)` → catalog entry
- Node.js: reads from filesystem
- Browser: uses `window.verblets.models` if set

### 2c. Update `src/constants/model-definition-schema.json`
- Add `provider` as required string field

### 2d. Update `src/services/llm-model/index.js`
- Use `resolveModel()` instead of direct `_models` lookup
- `getRequestConfig()`: provider-aware system prompt and parameter handling
- `negotiateModel()`: works against the catalog, respects mapping

### 2e. Documentation in README
- Section on model configuration: how capability names work
- Table of default mappings with costs
- How to create `.verblets.json` to override
- Links: [OpenAI models](https://platform.openai.com/docs/models), [Anthropic models](https://docs.anthropic.com/en/docs/about-claude/models), [Ollama models](https://ollama.com/library)

### ✓ Gate: `npm run test && npm run lint && npm run build && npm run examples` (OAI still works)

---

## Phase 3: Provider adapter layer

Goal: Extract fetch logic into provider adapters. This is where Anthropic actually starts working.

### 3a. Create provider adapters

Three providers, each a small module (~50-80 lines). All normalize to a **canonical response format**:
```js
{
  choices: [{
    message: {
      content: "...",
      tool_calls: [{ function: { name, arguments } }]
    }
  }]
}
```

**`src/lib/llm/providers/openai.js`** — OpenAI API
- `buildRequest(apiUrl, apiKey, endpoint, requestConfig)` → `{ url, fetchOptions }`
  - Auth: `Authorization: Bearer ${apiKey}`
  - Body: requestConfig as-is
- `parseResponse(json)` → canonical format (passthrough)

**`src/lib/llm/providers/anthropic.js`** — Anthropic API
- `buildRequest(apiUrl, apiKey, endpoint, requestConfig)` → `{ url, fetchOptions }`
  - Auth: `x-api-key: ${apiKey}`, `anthropic-version: 2023-06-01`
  - Extract system messages from `messages` → top-level `system` param
  - Translate `response_format` → `output_config: { format: { type: 'json_schema', schema } }`
  - Strip unsupported params (`frequency_penalty`, `presence_penalty`)
  - Ensure `max_tokens` is always set (required for Anthropic)
- `parseResponse(json)` → canonical format
  - `content[0].text` → `choices[0].message.content`
  - `content[].type === 'tool_use'` → `choices[0].message.tool_calls`
  - `stop_reason` → `choices[0].finish_reason`

**`src/lib/llm/providers/openwebui.js`** — OpenWebUI / Ollama / local models
- `buildRequest(apiUrl, apiKey, endpoint, requestConfig)` → `{ url, fetchOptions }`
  - Auth: `Authorization: Bearer ${apiKey}`
  - Strips `response_format` if model doesn't support structured output
  - Handles OpenWebUI's endpoint path differences
- `parseResponse(json)` → canonical format (OpenAI-compatible response shape)

**`src/lib/llm/providers/index.js`** — Provider registry
- `getProvider(providerName)` → adapter
- Registry: `{ openai, anthropic, openwebui }`

### 3b. Update `src/lib/llm/index.js`
- Replace inline fetch with provider delegation:
  ```js
  const provider = getProvider(modelFound.provider);
  const { url, fetchOptions } = provider.buildRequest(apiUrl, apiKey, endpoint, requestConfig);
  const response = await fetch(url, fetchOptions);
  const json = await response.json();
  result = provider.parseResponse(json);
  ```
- All other logic (caching, shapeOutput, abort signals, hooks) stays identical

### ✓ Gate: `npm run test && npm run lint && npm run build`

---

## Phase 4: Verify both providers with live examples

1. `npm run examples` with OpenAI (confirm no regression)
2. Test with Anthropic: use `.verblets.json` or global override to select Claude, run a subset of examples
3. Fix any Anthropic-specific issues (schema format, response parsing)

### ✓ Gate: `npm run test && npm run lint && npm run build && npm run examples` (both providers)

---

## Phase 5: NPM Publication

- Bump version: 0.3.2 → 0.4.0 (breaking: renamed public API)
- `npm run build && npm run test && npm run lint`
- `npm publish`

### ✓ Gate: package published, `npm info @far-world-labs/verblets` shows 0.4.0

---

## Phase 6: Smoke test from NPM

In a separate test directory:
- `npm install @far-world-labs/verblets@latest`
- Create test script importing `llm`, `bool`, `list` etc.
- Run against both OpenAI and Anthropic
- Verify exports work from the published package

### ✓ Gate: smoke test passes with both providers

---

## Phase 7: Composable Pattern Ideas (Future Work)

Inspired by OpenClaw's architecture but adapted to verblets philosophy:

1. **Provider mixing is already composable** — different verblets in a chain can use different providers/models per-call
2. **`spawn` verblet** — Run a verblet with isolated context and timeout
3. **`memory` lib utility** — Simple hybrid search over text collections
4. **`route` chain** — LLM-powered dispatch to the right handler
5. **`guard` lib utility** — Validate verblet output against constraints

---

## Known Concerns & Decisions

1. **Tokenizer is GPT-specific**: `gpt-tokenizer` produces GPT token counts for all models. Acceptable approximation for budgeting (~10-20% variance).

2. **Cache compatibility**: Canonical format matches current OpenAI format. Different models produce different cache keys. No migration needed.

3. **Anthropic quirks**: No `frequency_penalty`/`presence_penalty`, system prompt is top-level (not in messages), `max_tokens` required, structured output uses `output_config.format` not `response_format`.

4. **No new npm dependencies needed**: Verblets uses raw `fetch()`, not provider SDKs. Adapters handle format translation.

---

## File Change Summary

### Create
| File | Purpose |
|------|---------|
| `src/lib/llm/providers/openai.js` | OpenAI HTTP adapter (~50-80 lines) |
| `src/lib/llm/providers/anthropic.js` | Anthropic HTTP adapter (~50-80 lines) |
| `src/lib/llm/providers/openwebui.js` | OpenWebUI/Ollama adapter (~50-80 lines) |
| `src/lib/llm/providers/index.js` | Provider registry (~15 lines) |
| `src/lib/llm/config.js` | Config loader + model resolution (~30 lines) |

### Rename/Move (Phase 1)
| From | To |
|------|-----|
| `src/lib/chatgpt/` | `src/lib/llm/` |

### Modify (major)
| File | Phase | Changes |
|------|-------|---------|
| `src/lib/llm/index.js` | 3 | Delegate to provider adapters |
| `src/constants/models.js` | 2 | Catalog + mapping, remove OAI naming |
| `src/constants/model-definition-schema.json` | 2 | Add provider field |
| `src/constants/model-validation.js` | 2 | Validate provider |
| `src/services/llm-model/index.js` | 2 | Provider-aware config |
| `src/shared.js` | 1 | Export `llm` |
| `src/index.js` | 1 | Default export `llm` |
| `package.json` | 5 | Version bump |

### Modify (~83 code files + ~20 doc files, Phase 1)
All imports, call sites, mocks, and documentation referencing `chatgpt`/`chatGPT`
