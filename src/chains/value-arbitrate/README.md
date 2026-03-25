# value-arbitrate

Arbitrate a configuration value from multiple stakeholder signals with must/may semantics.

Must-signals are binding constraints — the most restrictive must determines a deterministic floor. May-signals are weighted preferences — when multiple mays compete within the must-constrained space, AI mediates via classify. The values array is ordered from least to most restrictive.

```javascript
import { valueArbitrate } from '@far-world-labs/verblets';
import { OpenFeature } from '@openfeature/server-sdk';

const flags = OpenFeature.getClient();

// Three teams each own a flag for document verification level.
// Compliance sets a regulatory floor. Product and SRE express preferences.
const verification = await valueArbitrate(
  [
    {
      name: 'compliance-floor',
      value: (ctx) => flags.getStringValue('compliance-verification-floor', 'standard', ctx),
      strictness: 'must',
    },
    {
      name: 'product-strategy',
      value: (ctx) => flags.getStringValue('product-verification-pref', 'light', ctx),
      strictness: 'may',
      weight: 0.4,
      prompt: 'trial users processing their first batch — minimize friction to show value quickly',
    },
    {
      name: 'provider-health',
      value: (ctx) => flags.getStringValue('sre-verification-level', 'standard', ctx),
      strictness: 'may',
      weight: 0.7,
      prompt: 'primary extraction model returning elevated error rates — compensate with more verification',
    },
  ],
  { targetingKey: tenantId, compliance: 'hipaa', plan: 'trial', providerStatus: 'degraded' },
  ['light', 'standard', 'thorough', 'maximum']
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
