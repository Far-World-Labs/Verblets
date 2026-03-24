# value-arbitrate

Arbitrate a configuration value from multiple stakeholder signals with must/may semantics.

Must-signals are binding constraints — the most restrictive must determines a deterministic floor. May-signals are weighted preferences — when multiple mays compete within the must-constrained space, AI mediates via classify. The values array is ordered from least to most restrictive.

```javascript
import { valueArbitrate } from '@far-world-labs/verblets';
import { OpenFeature } from '@openfeature/server-sdk';

const client = OpenFeature.getClient();

const level = await valueArbitrate(
  [
    {
      name: 'legal-floor',
      value: (ctx) => client.getStringValue('legal-floor', 'standard', ctx),
      strictness: 'must',
    },
    {
      name: 'product-preference',
      value: (ctx) => client.getStringValue('product-pref', 'minimal', ctx),
      strictness: 'may',
      weight: 0.3,
      prompt: 'lighter touch for engaged users',
    },
    {
      name: 'trust-safety',
      value: (ctx) => client.getStringValue('trust-safety', 'standard', ctx),
      strictness: 'may',
      weight: 0.6,
      prompt: 'elevated risk for flagged segments',
    },
  ],
  { kind: 'tenant', key: tenantId, plan: 'enterprise' },
  ['minimal', 'standard', 'strict', 'maximum']
);
```

## Signal shape

Each signal is a plain object:

- `name` — identifier for this stakeholder
- `value` — `(ctx) => any` evaluation function. The caller owns this — it can close over a flag service, a database lookup, or a static value
- `strictness` — `'must'` (binding constraint) or `'may'` (weighted preference)
- `weight` — 0–1, only meaningful for may-signals, influences AI mediation
- `prompt` — additional context for AI mediation

## Behavior

1. All signals are evaluated concurrently
2. Must-results determine a floor: the most restrictive must value (highest index in the values array) eliminates everything below it
3. If one candidate remains, it is returned deterministically — no AI call
4. If multiple mays compete within the constrained space, AI mediates using their names, weights, and prompts
5. An optional `instruction` on config appends to the mediation prompt

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `signals` | `Signal[]` | Array of stakeholder signal objects |
| `ctx` | `object` | Evaluation context passed to each signal's value function |
| `values` | `any[]` | Ordered from least to most restrictive |
| `config` | `object` | Standard chain config. `instruction` appends to the mediation prompt |
