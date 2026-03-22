# Option Resolution

The option resolution system lets chains declare their tuning parameters and resolve them from consumer config, policy functions, or defaults — all in one call. This is the internal API used by chain and verblet authors. For the consumer-facing view, see [configuration.md](./configuration.md).

## initChain

Most chains start with `initChain`, which combines `scopeOperation` (setting the operation name for policy targeting) with `getOptions` (batch-resolving all declared options):

```javascript
import { initChain, withPolicy } from '../../lib/context/option.js';

const { config, batchSize, compression } = await initChain('document-shrink', inputConfig, {
  batchSize: 50,                              // plain fallback
  compression: withPolicy(mapCompression),    // resolved through mapper
});
```

`initChain` returns `{ config, ...resolvedOptions }`. The `config` object is scoped to this operation and should be passed through to `callLlm`, `retry`, and any sub-chain calls.

## Resolution order

For each option, `getOption` checks three sources in order:

1. **Policy function** — `config.policy[name]` if it's a function, called with `(evalContext, { logger })`
2. **Direct config** — `config[name]`
3. **Fallback** — the default provided in the spec

```javascript
// Consumer sets temperature directly:
await filter(items, 'urgent', { temperature: 0.3 });

// Or via policy:
await filter(items, 'urgent', {
  policy: { temperature: (ctx) => ctx.operation === 'filter' ? 0.1 : 0.5 },
});
```

## withPolicy and mappers

`withPolicy(mapperFn)` tags a mapper function so `getOptions` knows to run the resolved value through it. Mappers translate consumer-friendly string dials (`'low'`, `'med'`, `'high'`) into concrete internal values:

```javascript
export const mapCompression = (value) => {
  if (value === undefined) return 0.3;          // default
  if (typeof value === 'number') return value;   // passthrough
  return { low: 0.45, med: 0.3, high: 0.15 }[value] ?? 0.3;
};
```

Every mapper follows the same shape: handle `undefined` (return default), handle the concrete type (passthrough), handle string dials (lookup table). Mappers are exported from the chain module for testing and external validation.

### Override keys

When a single consumer dial maps to multiple internal values, use `withPolicy` with override keys. The sub-properties are flattened into the result and the parent key is excluded:

```javascript
const { config, iterations, extremeK } = await initChain('score', inputConfig, {
  effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
});

// Consumer writes:    { effort: 'high' }
// Mapper returns:     { iterations: 2, extremeK: 15 }
// Destructured as:    iterations = 2, extremeK = 15
```

## scopeOperation

`scopeOperation` enriches `config.evalContext.operation` so policy functions can target behavior by chain name. Operations compose hierarchically when chains delegate to sub-chains:

```javascript
// Top-level: evalContext.operation = 'document-shrink'
// Sub-chain: evalContext.operation = 'document-shrink/score'
```

## getOption (single value)

For verblets or simple cases with only 1-2 options, use `getOption` directly instead of `getOptions`:

```javascript
const divergence = await getOption('divergence', config, undefined);
```

## Source

The full API — `getOption`, `getOptions`, `withPolicy`, `scopeOperation`, `initChain` — is exported from `src/lib/context/option.js`.
